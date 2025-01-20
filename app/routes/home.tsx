import { Text } from "~/components/text";
import { Heading } from "~/components/heading";

export default function Index() {
  return (
    <div className="flex items-center justify-center h-screen">
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow ">
      <div className="px-4 py-5 sm:px-6 text-center">
        <Heading>Automated handover evaluation tool</Heading>
      </div>
      <div className="px-4 py-5 sm:p-6 flex flex-col items-center gap-6">
        <Text>Use this application to record the audio from a clinical handover and have it evaluated by generative artificial intelligence</Text>
      </div>
    </div>
    </div>
  );
}
