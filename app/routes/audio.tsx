import type { Route } from "./+types/audio";
import {
    FileUpload,
    parseFormData,
} from "@mjackson/form-data-parser";
import {
    fileStorage,
    getStorageKey,
} from "~/audio-storage.server";
import { useState } from "react";
import { Outlet, redirect, useFetcher, useLocation } from "react-router";
import { addTranscription } from "~/db.server";
import { ArrowPathIcon, ArrowUpTrayIcon, CheckIcon } from '@heroicons/react/16/solid'
import { Button } from "~/components/button";
import AudioRecorder from "~/components/AudioRecorder";



export async function action({
    request,
    params,
}: Route.ActionArgs) {

    async function uploadHandler(fileUpload: FileUpload) {
        if (
            fileUpload.fieldName === "audio" &&
            fileUpload.type.startsWith("audio/")
        ) {

            console.log("Uploading audio file:", fileUpload.name);

            let storageKey = getStorageKey(params.id);

            // FileUpload objects are not meant to stick around for very long (they are
            // streaming data from the request.body); store them as soon as possible.
            await fileStorage.set(storageKey, fileUpload);

            // Return a File for the FormData object. This is a LazyFile that knows how
            // to access the file's content if needed (using e.g. file.stream()) but
            // waits until it is requested to actually read anything.
            return fileStorage.get(storageKey);

        }
    }

    const formData = await parseFormData(
        request,
        uploadHandler
    );
    const url = 'http://127.0.0.1:8000/transcribe/';
    const data = {
        key: `user-${params.id}-audio`
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
            await addTranscription(res.transcription, res.deid, params.id);
            return redirect(`/audio/${params.id}/transcription`);

        } catch (error) {
            return error;
        }
    } catch (error) {
        console.error('Error:', error);
    }

}
export default function Audio() {
    const fetcher = useFetcher();
    const [audioBlob, setAudioBlob] = useState<Blob>();

    const onRecordingComplete = (blob: Blob) => {
        setAudioBlob(blob);
    };
    const location = useLocation();
    return (
        <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-prose">
                    <div className="pt-4 space-y-4 ">
                        {location.pathname.endsWith('transcription') || location.pathname.endsWith('llm') ? null : (<AudioRecorder onRecordingComplete={onRecordingComplete} />)}
                        {audioBlob && !location.pathname.endsWith('transcription') && !location.pathname.endsWith('llm') && (
                            <>
                                <fetcher.Form method="post" encType="multipart/form-data" className="space-y-4">
                                    <Button
                                        onClick={() => {
                                            const formData = new FormData();
                                            formData.append("audio", audioBlob); // Add the recording of the audio.
                                            fetcher.submit(formData, { method: "post", encType: "multipart/form-data" });
                                        }}
                                    >
                                        {fetcher.state === "idle" ? (
                                            <>
                                                <ArrowUpTrayIcon />
                                                {' Transcribe Recording'}
                                            </>
                                        ) : (
                                            <>
                                                <ArrowPathIcon className='animate-spin' />
                                                {' Transcribing Recording'}
                                            </>
                                        )}
                                    </Button>
                                </fetcher.Form>
                            </>
                        )}
                        <Outlet />
                    </div>
                </div>
            </div>
        </>
    );
}
