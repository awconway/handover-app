import type { Route } from "./+types/home";
import {
    FileUpload,
    parseFormData,
} from "@mjackson/form-data-parser";
import {
    fileStorage,
    getStorageKey,
} from "~/audio-storage.server";

export async function action({
    request,
    params,
}: Route.ActionArgs) {
    async function uploadHandler(fileUpload: FileUpload) {
        if (
            fileUpload.fieldName === "audio" &&
            fileUpload.type.startsWith("audio/")
        ) {
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
    }
export default function Audio({
        actionData,
        params,
    }: Route.ComponentProps) {
        return (
            <>
                <div>
                    <div>
                        <h1>User {params.id}</h1>
                        <form
                            method="post"
                            // The form's enctype must be set to "multipart/form-data" for file uploads
                            encType="multipart/form-data"
                        >
                            <input type="file" name="audio" accept="audio/*" />
                            <button>Submit</button>
                        </form>

                        <audio
                        controls
                        >
                            <source src={`/user/${params.id}/audio`} ></source>
                        </audio>
                    </div>
                </div>
            </>
        );
    }
