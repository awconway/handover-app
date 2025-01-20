import clsx from 'clsx';

export const editorProps = {
  attributes: {
    // these are styles for the actual textbox of the editor. taken from the HeadlessTextarea part of the textarea component
    class: clsx([
      'relative block h-full w-full appearance-none rounded-lg px-[calc(theme(spacing[3.5])-1px)] py-[calc(theme(spacing[2.5])-1px)] sm:px-[calc(theme(spacing.3)-1px)] sm:py-[calc(theme(spacing[1.5])-1px)]',

      // Typography
      'prose',
      'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',

      // Border
      'border border-zinc-950/10 data-[hover]:border-zinc-950/20 dark:border-white/10 dark:data-[hover]:border-white/20',

      // Background color
      'bg-transparent dark:bg-white/5',

      // Hide default focus styles
      'focus:outline-none',

      // Invalid state
      'data-[invalid]:border-red-500 data-[invalid]:data-[hover]:border-red-500 data-[invalid]:dark:border-red-600 data-[invalid]:data-[hover]:dark:border-red-600',

      // Disabled state
      'disabled:border-zinc-950/20 disabled:dark:border-white/15 disabled:dark:bg-white/[2.5%] dark:data-[hover]:disabled:border-white/15',

      'resize-y overflow-auto min-h-[200px]',


    ]),
  },
};