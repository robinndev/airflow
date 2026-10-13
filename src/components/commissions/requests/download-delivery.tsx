"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { deliveryFiles } from "@/app/(site)/request-actions";

/**
 * The delivered files, as the artist uploaded them: links are signed when
 * asked for (they last an hour), so they're fetched on click. One file
 * downloads right away; several are listed.
 */
export function DownloadDelivery({ id }: { id: string }) {
  const [files, setFiles] = useState<{ url: string; name: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    start(async () => {
      const result = await deliveryFiles(id);
      if (!result.ok) return setError(result.error);
      setFiles(result.files);
      if (result.files.length === 1) window.location.assign(result.files[0].url);
    });
  }

  return (
    <div className="grid gap-1.5">
      {files && files.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, i) => (
            <li key={file.url}>
              <a
                href={file.url}
                download={file.name}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-on-paper px-3 text-xs font-semibold text-paper"
              >
                <Download aria-hidden className="size-3.5" />
                File {i + 1}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={load}
          className="inline-flex h-9 items-center gap-1.5 justify-self-start rounded-full bg-on-paper px-3.5 text-[0.8125rem] font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
          Download the files
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
