import type { Route } from "./+types/audio";
import { useState } from "react";
import { Outlet, redirect, useFetcher, useLocation } from "react-router";
import { addTranscription } from "~/db.server";
import { ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/16/solid'
import { Button } from "~/components/button";
import AudioRecorder from "~/components/AudioRecorder";



export async function action({
    request,
    params,
}: Route.ActionArgs) {
    
    
    const audioData = await request.formData();
        try {
            const response = await fetch("http://localhost:8000/transcribe/", {
                method: "POST",
                body: audioData,
        
            })
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
export default function Audio({ params }: Route.ComponentProps) {
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
                                            formData.append("audio", audioBlob, `user-${params.id}-audio`); // Add the recording of the audio.
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
