import { useState, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import debounce from 'lodash.debounce';
import { Settings, Play, Terminal, Cpu, Info } from 'lucide-react';

interface UIComponent {
  type: 'button' | 'input' | 'text' | 'label';
  label?: string;
  placeholder?: string;
  id: string;
  value?: string;
}

interface AIResponse {
  output: string;
  components?: UIComponent[];
  error?: string;
}

function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<AIResponse | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [localModelUrl, setLocalModelUrl] = useState(localStorage.getItem('local_model_url') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('local_model_url', localModelUrl);
  }, [localModelUrl]);

  const compileSnippet = async (code: string) => {
    if (!code.trim()) {
      setOutput(null);
      return;
    }

    if (!apiKey && !localModelUrl) {
      setOutput({ output: 'Please configure Gemini API Key or Local Model URL in settings.', error: 'config_missing' });
      return;
    }

    setIsLoading(true);
    try {
      let resultText = '';

      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
          You are a Universal Snippet Compiler. 
          The user provides a code snippet. Your task is to:
          1. Understand what the code does.
          2. If the code is a snippet that would produce an output, simulate that output.
          3. If the code describes an interface or interaction, generate the necessary UI components.
          
          RESPONSE FORMAT:
          Return a JSON object with the following structure:
          {
            "output": "The textual output or result of the code",
            "components": [
              { "type": "button", "label": "Click Me", "id": "btn1" },
              { "type": "input", "placeholder": "Enter name", "id": "name_input" }
            ] (optional)
          }

          USER SNIPPET:
          ${code}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        resultText = response.text();
      } else if (localModelUrl) {
        // Mock local model call
        const response = await fetch(localModelUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: code })
        });
        const data = await response.json();
        resultText = data.output;
      }

      // Try to parse JSON from resultText (AI might wrap it in code blocks)
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AIResponse;
        setOutput(parsed);
      } else {
        setOutput({ output: resultText });
      }
    } catch (err) {
      setOutput({ output: `Error: ${err instanceof Error ? err.message : String(err)}`, error: 'execution_error' });
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedCompile = useCallback(
    debounce((code: string) => compileSnippet(code), 1000),
    [apiKey, localModelUrl]
  );

  useEffect(() => {
    debouncedCompile(input);
  }, [input, debouncedCompile]);

  const handleInteraction = (compId: string, value?: string) => {
    // This is where we could send interaction back to the AI for a "stateful" update
    console.log('Interaction:', compId, value);
    // For now, let's just log it. A more advanced version would re-prompt the AI.
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Mini Snippets Compiler
          </h1>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" /> AI Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Gemini API Key</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Local Model URL</label>
                <input 
                  type="text"
                  value={localModelUrl}
                  onChange={(e) => setLocalModelUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1/chat/completions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Input Box */}
        <div className="flex-1 flex flex-col border-r border-slate-800 relative">
          <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-medium text-slate-500 pointer-events-none uppercase tracking-widest">
            <Play className="w-3 h-3" /> Input Snippet
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-full bg-slate-950 p-10 pt-12 resize-none outline-none font-mono text-sm leading-relaxed text-blue-50 focus:bg-slate-900/30 transition-colors"
            placeholder="// Write any snippet here...
// e.g. python: print('hello')
// or js: alert('hi')
// or even just: 'sum of first 10 numbers'"
          />
        </div>

        {/* Output Box */}
        <div className="flex-1 flex flex-col bg-slate-900/30 relative">
          <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-medium text-slate-500 pointer-events-none uppercase tracking-widest">
            <Terminal className="w-3 h-3" /> Live Output
          </div>
          
          <div className="flex-1 p-10 pt-12 overflow-auto">
            {isLoading ? (
              <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                <span className="text-sm">Compiling...</span>
              </div>
            ) : output ? (
              <div className="space-y-6">
                <div className="font-mono text-sm whitespace-pre-wrap text-emerald-400">
                  {output.output}
                </div>
                
                {output.components && output.components.length > 0 && (
                  <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-4">
                    {output.components.map((comp) => (
                      <div key={comp.id} className="flex flex-col gap-2">
                        {comp.type === 'label' && <label className="text-sm text-slate-400">{comp.label}</label>}
                        {comp.type === 'button' && (
                          <button 
                            onClick={() => handleInteraction(comp.id)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-1.5 rounded text-sm transition-colors"
                          >
                            {comp.label}
                          </button>
                        )}
                        {comp.type === 'input' && (
                          <input 
                            type="text"
                            placeholder={comp.placeholder}
                            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 transition-all"
                            onChange={(e) => handleInteraction(comp.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Info className="w-12 h-12 opacity-20" />
                <p className="text-sm max-w-[200px] text-center italic">
                  Results will appear here as you type...
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
