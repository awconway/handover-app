import { ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/16/solid'
import { Code, Text } from "~/components/text";
import { Description, Field, Fieldset, Label, Legend } from '~/components/fieldset'
import { Radio, RadioField, RadioGroup } from '~/components/radio'
import { addLLMresponse, getTranscriptions } from '~/db.server';
import type { Route } from './+types/transcription';
import { Outlet, redirect, useFetcher } from 'react-router';
import ISBARHighlighter from "~/components/IsbarHighlighter";

// rich text editor
import { Suspense, lazy, useState } from "react";
import { extensions } from "~/textEditorSetup/extensions";
import { useEditor } from "@tiptap/react";
import { editorProps } from "~/textEditorSetup/editorProps";


// catalyst ui
import { Button } from "~/components/button";
import { AlertActions, AlertDescription } from "~/components/alert";
import { Heading, Subheading } from '~/components/heading';
import { PaginationPrevious } from '~/components/pagination';
const EditorModule = lazy(() => import('~/textEditorSetup/Editor'));

export async function loader({ request, params }: Route.LoaderArgs) {
    if (!params.id) {
        throw new Error("params.id is required");
    }
    const data = await getTranscriptions(params.id);

    const url = 'http://127.0.0.1:8000/tokens/';
    const prompt = `
    You are a clinical documentation analysis tool designed to systematically categorize information from a clinical handover note according to the ISBAR framework and extract text from the handover into a structured format.
    For the given clinical handover text that you are given, please identify and extract text that aligns with ISBAR categories.
    Instructions:
    - Ensure that no text from the transcript is extracted into more than one quote. Each extracted piece of text must belong to a single category.
    - Information from the text can appear out of sequence; identify and assign it correctly regardless of its position.
    - Do not paraphrase, summarize, or modify words, capitalization or punctuation. Information must be extracted exactly from the original text. No rephrasing is allowed.
    `
    let tokens = null;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: data[0].deid,
                model: data[0].llm,
                prompt: prompt
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        tokens = await response.json();

    } catch (error) {
        console.error('Error:', error);
    }


    return { data, tokens }
}

export async function action({
    request,
    params,
}: Route.ActionArgs) {
    const formData = await request.formData();
    const transcription = formData.get("textEditor");
    const model = formData.get("model");

    const url = 'http://127.0.0.1:8000/llm/';
    const data = {
        transcript: transcription,
        model: model,
        prompt: formData.get("promptEditor"),
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const res = await response.json();
        try {
            const result = await addLLMresponse(String(transcription), String(transcription), res.llmresponse, String(model), res.usage, params.id);
            const row_id = result[0].id;
            return redirect(`/audio/${params.id}/transcription/${row_id}/llm`);
        } catch (error) {
            return error;
        }
    } catch (error) {
        console.error('Error:', error);
    }

}

export default function Audio({
    params,
    loaderData
}: Route.ComponentProps) {
    const { data, tokens } = loaderData;
    const fetcher = useFetcher();
    const convertedDeid = data[0].deid;
    const [textEditor, setTextEditor] = useState(convertedDeid);
    const editor = useEditor({
        editable: true,
        content: convertedDeid,
        extensions: extensions,
        immediatelyRender: false,
        onUpdate({ editor }) {
            setTextEditor(editor.getText());
        },
        editorProps: editorProps,
    });
const gptminiInputTokens = (((((tokens.transcript_tokens) + tokens.prompt_tokens) * (0.15 / 1000000)) * 1.61) * 1000)
const gptminiOutputTokens = (((((tokens.transcript_tokens)) * (0.6 / 1000000)) * 1.61) * 1000) // basically the same as input because asking for it to categorise the text from the input
const gptminiTotalTokens = (gptminiInputTokens + gptminiOutputTokens).toPrecision(3)
const gpt4oInputTokens = (((((tokens.transcript_tokens) + tokens.prompt_tokens) * (2.5 / 1000000)) * 1.61) * 1000)
const gpt4oOutputTokens = (((((tokens.transcript_tokens)) * (10 / 1000000)) * 1.61) * 1000) // basically the same as input because asking for it to categorise the text from the input
const gpt4oTotalTokens = (gpt4oInputTokens + gpt4oOutputTokens).toPrecision(3)
    return (
        <div className="space-y-4">
            <audio
                controls
            >
                <source src={`/user/${params.id}/audio`} ></source>
            </audio>
            <fetcher.Form
                method="post"
                className="flex flex-col gap-4 pt-4"
                preventScrollReset
            >

                <Field>
                    <Label htmlFor="textEditor">1. Review the transcript for identifiable information</Label>
                    <Description>
                        You can de-identify the transcript of the audio recording below before evaluating the content. Potential personal health information is highlighted in capitals.
                    </Description>
                    <Suspense fallback={<div>Loading...</div>}>
                        <EditorModule editor={editor} />
                    </Suspense>
                    <input type="hidden" name="textEditor" value={textEditor} />
                    <input type="hidden" name="id" value={params.id} />
                </Field>
                <Fieldset>
                    <Legend>2. Select a model to evaluate the handover content</Legend>
                    <Text>Evaluating the handover involves sending the transcribed text to an external server.</Text>
                    <RadioGroup name="model" defaultValue={data[0].llm}>
                        <RadioField>
                            <Radio value="gpt-4o-mini" />
                            <Label>GPT 4o mini</Label>
                            <Description>Cheaper option to use most often (approximately ${gptminiTotalTokens} to evaluate 1000 handovers of similar length)</Description>
                        </RadioField>
                        <RadioField>
                            <Radio value="gpt-4o" />
                            <Label>GPT 4o</Label>
                            <Description>This model may produce more accurate results at a higher cost (approximately ${gpt4oTotalTokens} to evaluate 1000 handovers of similar length)</Description>
                        </RadioField>
                    </RadioGroup>
                </Fieldset>
                <Field>
                    <Subheading>The text below is the 'prompt' (i.e. instructions) that will be sent to the large language model to evaluate the handover.</Subheading>
                    <Text>
                        <p>
                            You are a clinical documentation analysis tool designed to systematically categorize information from a clinical handover note according to the ISBAR framework and extract text from the handover into a structured format. For the given clinical handover text that you are given, please identify and extract text that aligns with ISBAR categories.
                        </p>
                        <p>
                            Instructions:
                        </p>
                        <ul className='list-disc mx-8'>
                            <li>
                                Ensure that no text from the transcript is extracted into more than one quote. Each extracted piece of text must belong to a single category.
                            </li>
                            <li>
                                Information from the text can appear out of sequence; identify and assign it correctly regardless of its position.
                            </li>
                            <li>
                                Do not paraphrase, summarize, or modify words, capitalization or punctuation. Information must be extracted exactly from the original text. No rephrasing is allowed.
                            </li>
                        </ul>
                    </Text>
                </Field>
                <AlertActions>
                    <Button
                        type="submit"
                    >
                        {fetcher.state === "idle" ? (
                            <>
                                <ArrowUpTrayIcon />
                                {' Evaluate handover'}
                            </>
                        ) : (
                            <>
                                <ArrowPathIcon className='animate-spin' />
                                {' Evaluating handover'}
                            </>
                        )}
                    </Button>
                </AlertActions>
            </fetcher.Form>
            <Outlet />
        </div>
    )
}