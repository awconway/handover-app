import { getTranscriptions } from "~/db.server";
import type { Route } from "./+types/llm";
import { Subheading } from "~/components/heading";
import ISBARHighlighter from "~/components/IsbarHighlighter";
import { useEffect, useRef } from "react";
import { Divider } from "~/components/divider";
import { Text } from "~/components/text";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) {
    throw new Error("params.id is required");
  }
  const data = await getTranscriptions(params.id);
  return { data };
}

export default function Llm({ params, loaderData }: Route.ComponentProps) {
  const { data } = loaderData;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return (
    <div className="">
      <Subheading level={2} ref={headingRef}>
        Handover evaluation
      </Subheading>
      <Text className="leading-10">
        <ISBARHighlighter
          transcript={data[0].deid}
          isbarData={data[0].llmresponse.ISBAR}
        />
      </Text>
      <Divider className="mt-48" />
      <details className="mt-8">
        <summary>LLM model response</summary>
        <pre>{JSON.stringify(data[0].llmresponse.ISBAR, null, 2)}</pre>
      </details>
    </div>
  );
}
