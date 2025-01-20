import { EditorContent, useEditor } from "@tiptap/react";
import { MenuBar } from "./MenuBar";
import clsx from "clsx";

export default function Editor(props: { editor: ReturnType<typeof useEditor> }) {
    return (
        <>
            <MenuBar editor={props.editor} />
            {/* styles from the span in the textarea component */}
            <span className={clsx(
                // Basic layout
                'relative block w-full',

                // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
                'before:absolute before:inset-px before:rounded-[calc(theme(borderRadius.lg)-1px)] before:bg-white before:shadow',

                // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
                'dark:before:hidden',

                // Focus ring
                'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset after:ring-transparent sm:after:focus-within:ring-2 sm:after:focus-within:ring-blue-500',

                // Disabled state
                'has-[[data-disabled]]:opacity-50 before:has-[[data-disabled]]:bg-zinc-950/5 before:has-[[data-disabled]]:shadow-none',
            )}>
                <EditorContent editor={props.editor} />
            </span>
        </>
    );
}