from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List
import json

# imports for transcription
import os
import whisperx
import os
import subprocess
import numpy as np
# imports for language model
from openai import OpenAI
from dotenv import load_dotenv

# imports for deidentification
from transformers import HfArgumentParser, TrainingArguments

from robust_deid.ner_datasets import DatasetCreator
from robust_deid.sequence_tagging import SequenceTagger
from robust_deid.sequence_tagging.arguments import (
    ModelArguments,
    DataTrainingArguments,
    EvaluationArguments,
)
from robust_deid.deid import TextDeid

# imports for token count
import tiktoken


load_dotenv()  # take environment variables from .env.

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


app = FastAPI()

class InputModel(BaseModel):
    transcript: str
    model: str



class ISBARModel(BaseModel):
    quote: str
    label: str


class ISBAROutput(BaseModel):
    spans: List[ISBARModel]

prompt = """
# Your task

You are a clinical documentation analysis tool designed to systematically categorize information from a clinical handover note according to the ISBAR framework and extract text into a structured format.

## Instructions
1. Identify and extract text from the clinical handover transcript that aligns with the ISBAR framework categories: **IDENTIFICATION, SITUATION, BACKGROUND, ASSESSMENT, RECOMMENDATION**.
2. **Each extracted quote must represent a single piece of information**. If the transcript contains multiple pieces of information within the same category, extract each as a separate quote.
3. **Do not combine unrelated details** into a single quote. Each piece of extracted text should be concise and specific to one detail.
4. Extracted text must appear **exactly as written in the original transcript**, preserving spelling, capitalization, punctuation, and phrasing. Do not paraphrase. Do not summarize. Do not correct incorrectly spelled words. Do not correct errors. Do not rephrase.
5. Text can appear out of sequence in the transcript. Assign it to the correct ISBAR category based on its content, regardless of its position in the transcript.
6. If text does not fit into any ISBAR category, do not extract it.
"""

@app.post("/llm/")
async def get_eval(data: InputModel):
    OPENAI_MODEL = data.model
    transcription = data.transcript

    # Use OpenAI API to process the transcript
    response = client.beta.chat.completions.parse(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": transcription}
        ],
        response_format=ISBAROutput
    )
    # print number of tokens used
    print(response.usage)
    print(response.choices[0].message.parsed)
    return {
            "llmresponse": response.choices[0].message.parsed,
            "usage": response.usage
            }

class Tokens(BaseModel):
    transcript: str
    model: str

def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """Returns the number of tokens in a text string."""
    encoding_name_string = tiktoken.encoding_for_model(encoding_name).name  # returns str 
    encoding = tiktoken.get_encoding(encoding_name_string)
    num_tokens = len(encoding.encode(string))
    return num_tokens

@app.post("/tokens/")
async def get_tokens(data: Tokens):
    transcript_tokens = num_tokens_from_string(data.transcript, data.model)
    prompt_tokens = num_tokens_from_string(prompt, data.model)
    input_tokens = transcript_tokens + prompt_tokens
    return {
        "input_tokens": input_tokens,
        "transcript_tokens": transcript_tokens,
        "prompt_tokens": prompt_tokens
    }

@app.post("/transcribe/")
async def transcribe_audio(audio: UploadFile = File(...)):
    filename = audio.filename
    # device = "cpu"
    device = "cuda"  # use "cuda" for GPU
    batch_size = 16  # reduce if low on GPU mem
    # change to "int8" if low on GPU mem or mac (may reduce accuracy)
    compute_type = "float16"
    # compute_type="int8"
    # 1. Transcribe with original whisper (batched)
    model = whisperx.load_model(
        "distil-large-v3", device, 
        compute_type=compute_type
        )
    webm_buffer = audio.file.read()
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-threads", "0",
        "-i", "pipe:0",  # Read input from stdin (WebM buffer)
        "-f", "s16le",  # Output format: signed 16-bit little-endian PCM
        "-ac", "1",  # Convert to mono
        "-acodec", "pcm_s16le",  # Use PCM 16-bit codec
        "-ar", str(16000),  # Set sample rate
        "pipe:1",  # Output raw PCM audio to stdout
    ]

    # Run the command with input from buffer and capture output
    process = subprocess.run(cmd, input=webm_buffer, capture_output=True, check=True)
    out = process.stdout  # This contains the raw PCM audio
    audio = np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

    result = model.transcribe(audio, batch_size=batch_size)
    # 2. Align whisper output
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device=device)
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

    transcription = " ".join([entry["text"] for entry in result["segments"]])
    # transcription = "On bed 4 it's Vera Abbot 93 years old under Dr. Liu. She came in with chest pain and with a history of stroke and three previous chest pains. She's in also Kathara asthma in Blochoma and she's almost blind and she needs assistance with her ADLs. She had three nitros today but still got no effect and she is under monitoring. Under that she is the... well all her orbs are fine and that's all for her."
    # transcription = " On bed two, it's Pierre Cox, 77 years old under Dr. Greger, came in with pain and swelling of the right leg and query embolism. He's got a history of coronary artery disease, and he's a heavy smoker.  He is four-leg ultrasound today at 2 p.m. and on therapeutic lexane. He still complains of pain scoring 9 out of 10, and endon was given with good effect. He's charted for...  regular oxycontin and panadol for pain and can still have endoprr for pain. He needs assistance in transfers and he transfers using a commode chair to the toilet and he's unable to walk due to pain in the leg.  He is in a low-fat diet and he is still for review by the team and the consultant hasn't seen him yet. His obs are all normal but with slightly raised blood pressure, maybe due to pain, but the doctors are aware.  He started a nicotine patch, but he really doesn't like it. And he still wants to smoke outside, but advise not to. And that's all for him."

    identifiable_transcript = {
        "text": transcription,
        "meta": {"note_id": filename, "patient_id": filename},
        "spans": []
    }

    with open(f"deid/transcripts/{filename}.jsonl", "w") as f:
        f.write(json.dumps(identifiable_transcript))

    # deidentify the transcription

    # ## STEP 1: INITIALIZE

    input_file = f"deid/transcripts/{filename}.jsonl"

    # Initialize the location where we will store the sentencized and tokenized dataset (ner_dataset_file)
    ner_dataset_file = 'deid/test.jsonl'
    
    # Initialize the location where we will store the model predictions (predictions_file)
    # Verify this file location - Ensure it's the same location that you will pass in the json file
    # to the sequence tagger model. i.e. output_predictions_file in the json file should have the same
    # value as below
    predictions_file = 'deid/predictions.jsonl'
    
    # Initialize the model config. This config file contains the various parameters of the model.
    model_config = 'deid/predict_i2b2.json'
    
    # ## STEP 2: NER DATASET
    # * Sentencize and tokenize the raw text. We used sentences of length 128, which includes an additional 32 context tokens on either side of the sentence. These 32 tokens serve (from the previous & next sentence) serve as additional context to the current sentence.
    # * We used the en_core_sci_lg sentencizer and a custom tokenizer (can be found in the preprocessing module)
    # * The dataset stored in the ner_dataset_file will be used as input to the sequence tagger model

    # Create the dataset creator object
    dataset_creator = DatasetCreator(
        sentencizer='en_core_sci_sm',
        tokenizer='clinical',
        max_tokens=128,
        max_prev_sentence_token=32,
        max_next_sentence_token=32,
        default_chunk_size=32,
        ignore_label='NA'
    )

    # This function call sentencizes and tokenizes the dataset
    # It returns a generator that iterates through the sequences.
    # We write the output to the ner_dataset_file (in json format)
    ner_notes = dataset_creator.create(
        input_file=input_file,
        mode='predict',
        notation='BILOU',
        token_text_key='text',
        metadata_key='meta',
        note_id_key='note_id',
        label_key='label',
        span_text_key='spans'
    )
    # Write to file
    with open(ner_dataset_file, 'w') as file:
        for ner_sentence in ner_notes:
            file.write(json.dumps(ner_sentence) + '\n')

    # ## STEP 3: SEQUENCE TAGGING
    # * Run the sequence model - specify parameters to the sequence model in the config file (model_config). The model will be run with the specified parameters. For more information of these parameters, please refer to huggingface (or use the docs provided).
    # * This file uses the argmax output. To use the recall threshold models (running the forward pass with a recall biased threshold for aggressively removing PHI) use the other config files.
    # * The config files in the i2b2 direct`ory specify the model trained on only the i2b2 dataset. The config files in the mgb_i2b2 directory is for the model trained on both MGB and I2B2 datasets.
    # * You can manually pass in the parameters instead of using the config file. The config file option is recommended. In our example we are passing the parameters through a config file. If you do not want to use the config file, skip the next code block and manually enter the values in the following code blocks. You will still need to read in the training args using huggingface and change values in the training args according to your needs.

    parser = HfArgumentParser((
        ModelArguments,
        DataTrainingArguments,
        EvaluationArguments,
        TrainingArguments
    ))
    # If we pass only one argument to the script and it's the path to a json file,
    # let's parse it to get our arguments.
    model_args, data_args, evaluation_args, training_args = parser.parse_json_file(
        json_file=model_config)

    # Initialize the sequence tagger
    sequence_tagger = SequenceTagger(
        task_name=data_args.task_name,
        notation=data_args.notation,
        ner_types=data_args.ner_types,
        model_name_or_path=model_args.model_name_or_path,
        config_name=model_args.config_name,
        tokenizer_name=model_args.tokenizer_name,
        post_process=model_args.post_process,
        cache_dir=model_args.cache_dir,
        model_revision=model_args.model_revision,
        use_auth_token=model_args.use_auth_token,
        threshold=model_args.threshold,
        do_lower_case=data_args.do_lower_case,
        fp16=training_args.fp16,
        seed=training_args.seed,
        local_rank=training_args.local_rank
    )

    # Load the required functions of the sequence tagger
    sequence_tagger.load()

    # Set the required data and predictions of the sequence tagger
    # Can also use data_args.test_file instead of ner_dataset_file (make sure it matches ner_dataset_file)
    sequence_tagger.set_predict(
        test_file=ner_dataset_file,
        max_test_samples=data_args.max_predict_samples,
        preprocessing_num_workers=data_args.preprocessing_num_workers,
        overwrite_cache=data_args.overwrite_cache
    )

    # Initialize the huggingface trainer
    sequence_tagger.setup_trainer(training_args=training_args)

    # Store predictions in the specified file
    predictions = sequence_tagger.predict()
    # Write predictions to a file
    with open(predictions_file, 'w') as file:
        for prediction in predictions:
            file.write(json.dumps(prediction) + '\n')

    # ## STEP 4: DE-IDENTIFY TEXT
    #
    # * This step uses the predictions from the previous step to de-id the text. We pass the original input file where the original text is present. We look at this text and the predictions and use both of these to de-id the text.

    # Initialize the text deid object
    text_deid = TextDeid(notation='BILOU', span_constraint='super_strict')

    # De-identify the text - using deid_strategy=replace_informative doesn't drop the PHI from the text, but instead
    # labels the PHI - which you can use to drop the PHI or do any other processing.
    # If you want to drop the PHI automatically, you can use deid_strategy=remove
    deid_notes = text_deid.run_deid(
        input_file=input_file,
        predictions_file=predictions_file,
        deid_strategy='replace_informative',
        keep_age=False,
        metadata_key='meta',
        note_id_key='note_id',
        tokens_key='tokens',
        predictions_key='predictions',
        text_key='text',
    )

    deidentified_transcription = list(deid_notes)
    deid_raw = deidentified_transcription[0]["deid_text"]
    # remove the << and >> from the deid text
    deid = deid_raw.replace("<<", "").replace(">>", "")

    # clean up the files
    os.remove(input_file)
    os.remove(ner_dataset_file)
    os.remove(predictions_file)

    return {"transcription": transcription,
            "deid": deid }