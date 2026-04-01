import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader } from 'lucide-react';
import type { CodeExecuteResponse } from '../types';
import { LANGUAGES } from '../types';

interface CodeEditorProps {
  languageKey: string;
  sectionId?: string;
  onExecute: (code: string) => Promise<CodeExecuteResponse>;
  isSubmitting: boolean;
  output: CodeExecuteResponse | null;
}

export default function CodeEditor({
  languageKey,
  sectionId,
  onExecute,
  isSubmitting,
  output,
}: CodeEditorProps) {
  const lang = LANGUAGES[languageKey] || LANGUAGES.python;
  const [code, setCode] = useState(lang.boilerplate);

  const handleRun = async () => {
    await onExecute(code);
  };

  return (
    <div className="glass overflow-hidden animate-slide-up">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: lang.color }}
          />
          <span className="text-sm font-mono text-zinc-400">{lang.label}</span>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isSubmitting}
          className="btn-green !px-4 !py-1.5 text-sm flex items-center gap-2"
          aria-label={isSubmitting ? 'Running code…' : 'Run code'}
        >
          {isSubmitting ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {isSubmitting ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* Monaco Editor */}
      <Editor
        height="320px"
        language={lang.monacoLang}
        value={code}
        onChange={(v) => setCode(v ?? '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          wordWrap: 'on',
          tabSize: 4,
          automaticLayout: true,
        }}
      />

      {/* Output panel */}
      {output && (
        <div className="border-t border-white/5 p-4 bg-black/30">
          <h4 className="text-xs font-mono text-zinc-500 uppercase mb-2">
            Output
          </h4>

          {/* stdout / stderr */}
          {output.stdout && (
            <pre className="text-sm text-green-accent mb-2 whitespace-pre-wrap !bg-transparent !border-0 !p-0">
              {output.stdout}
            </pre>
          )}
          {output.stderr && (
            <pre className="text-sm text-red-accent mb-2 whitespace-pre-wrap !bg-transparent !border-0 !p-0">
              {output.stderr}
            </pre>
          )}

          {/* Test results */}
          {output.test_results && output.test_results.length > 0 && (
            <div className="mt-3 space-y-2">
              <h4 className="text-xs font-mono text-zinc-500 uppercase">
                Test Results
              </h4>
              {output.test_results.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                    t.passed
                      ? 'bg-green-accent/10 text-green-accent'
                      : 'bg-red-accent/10 text-red-accent'
                  }`}
                >
                  <span>{t.passed ? '✓' : '✗'}</span>
                  <div className="font-mono">
                    <div>Input: {t.input}</div>
                    <div>Expected: {t.expected}</div>
                    {!t.passed && <div>Got: {t.actual}</div>}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-sm font-semibold">
                {output.passed !== null && output.total !== null && output.passed === output.total ? (
                  <span className="text-green-accent">
                    ✓ All tests passed! ({output.passed}/{output.total})
                  </span>
                ) : (
                  <span className="text-red-accent">
                    ✗ {output.passed ?? 0}/{output.total ?? 0} tests passed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
