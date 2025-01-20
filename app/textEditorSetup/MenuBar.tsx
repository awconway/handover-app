import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/react/16/solid";
import { useEditor } from "@tiptap/react";
import { Button } from "~/components/button";

export function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
    if (!editor) {
      return null;
    }
    return (
      <div className="my-2 flex flex-wrap gap-2">
        <Button
          outline
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <ArrowUturnLeftIcon />
        </Button>
        <Button
          outline
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <ArrowUturnRightIcon />
        </Button>
      </div>
    );
  };