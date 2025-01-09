import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Sun, Moon, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';

// Initialize mermaid with enhanced configuration
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    fontSize: 16,
    logLevel: 'error',
    flowchart: {
        htmlLabels: true,
        curve: 'linear',
    },
    sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
    }
});

// API Client 
class LangflowAPI {
  constructor() {
      this.baseUrl = process.env.REACT_APP_API_BASE_URL;
  }


    extractTextFromResponse(responseData) {
        try {
            if ("outputs" in responseData && responseData.outputs.length > 0) {
                const firstOutput = responseData.outputs[0];
                if ("outputs" in firstOutput && firstOutput.outputs.length > 0) {
                    const results = firstOutput.outputs[0].results || {};
                    const message = results.message || {};
                    return message.text || "No response text found";
                }
            }
            return "No response text found";
        } catch (error) {
            console.error("Error extracting text from response:", error);
            return "Error processing response";
        }
    }

    async runFlow(message, endpoint = "eba9f4be-3d7b-45ec-b580-a5d225a92b67", outputType = "chat", inputType = "chat", tweaks = null) {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message,
                    endpoint,
                    outputType,
                    inputType,
                    tweaks
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.extractTextFromResponse(data);

        } catch (error) {
            console.error("API request failed:", error);
            throw error;
        }
    }
}

// Enhanced Mermaid Component with error handling and fallback
const MermaidDiagram = ({ content, isDarkMode }) => {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(null);
    const diagramRef = useRef(null);

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                // Configure mermaid based on dark mode
                mermaid.initialize({
                    theme: isDarkMode ? 'dark' : 'default',
                    darkMode: isDarkMode,
                    logLevel: 'error',
                    securityLevel: 'loose',
                });

                // Sanitize the chart content
                const sanitizedContent = content.trim()
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .join('\n');

                // Generate unique ID for the diagram
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                // Attempt to render the diagram
                const { svg } = await mermaid.render(id, sanitizedContent);
                setSvg(svg);
                setError(null);
            } catch (err) {
                console.error('Mermaid rendering error:', err);
                setError({
                    message: 'Failed to render diagram',
                    details: err.message,
                    code: content
                });
            }
        };

        renderDiagram();
    }, [content, isDarkMode]);

    if (error) {
        return (
            <div className={`border ${isDarkMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50'} rounded-lg p-4 my-4`}>
                <p className={`text-${isDarkMode ? 'red-400' : 'red-600'} font-medium mb-2`}>
                    {error.message}
                </p>
                <p className={`text-${isDarkMode ? 'red-500' : 'red-700'} text-sm mb-4`}>
                    {error.details}
                </p>
                <div className={`bg-${isDarkMode ? 'gray-800' : 'gray-100'} p-4 rounded-lg`}>
                    <pre className="text-sm overflow-x-auto">
                        <code>{error.code}</code>
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={diagramRef}
            className={`my-4 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm overflow-auto`}
            dangerouslySetInnerHTML={{ __html: svg }} 
        />
    );
};

// Custom Markdown components with dark mode support
const getMarkdownComponents = (isDarkMode) => ({
    code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const content = String(children).replace(/\n$/, '');

        if (match && match[1] === 'mermaid') {
            return <MermaidDiagram content={content} isDarkMode={isDarkMode} />;
        }

        return !inline && match ? (
            <SyntaxHighlighter
                style={isDarkMode ? atomDark : oneLight}
                language={match[1]}
                PreTag="div"
                className="rounded-lg my-2"
                {...props}
            >
                {content}
            </SyntaxHighlighter>
        ) : (
            <code className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} px-1 rounded`} {...props}>
                {children}
            </code>
        );
    },
    p: ({ children }) => <p className="mb-4">{children}</p>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className={`border-l-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} pl-4 italic my-4`}>
            {children}
        </blockquote>
    ),
});

// Message Component with dark mode support
const MessageContainer = ({ message, isError = false, isDarkMode }) => {
    const userGradient = isDarkMode ? 'bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50' : 'bg-gradient-to-br from-violet-50 to-fuchsia-50';
    const assistantGradient = isDarkMode ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50' : 'bg-gradient-to-br from-gray-50 to-white';

    return (
        <div className={`mb-6 ${message.role === 'user' ? userGradient : assistantGradient} rounded-2xl shadow-sm border ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'} overflow-hidden`}>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200/10">
                {message.role === 'user' ? (
                    <div className="bg-violet-500 p-1.5 rounded-lg">
                        <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                ) : (
                    <div className="bg-fuchsia-500 p-1.5 rounded-lg">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                )}
                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
            </div>
            <div className="px-6 py-4">
                <ReactMarkdown 
                    components={getMarkdownComponents(isDarkMode)}
                    className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
                >
                    {message.content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const messagesEndRef = useRef(null);
    const api = new LangflowAPI();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(savedDarkMode);
    }, []);

    useEffect(() => {
        localStorage.setItem('darkMode', isDarkMode);
    }, [isDarkMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await api.runFlow(userMessage);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: response 
            }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `Error: ${error.message}`,
                isError: true 
            }]);
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Enhanced Header */}
            <div className={`fixed top-0 left-0 right-0 z-10 backdrop-blur-lg ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'} border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="container mx-auto px-4 py-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`${isDarkMode ? 'bg-violet-500' : 'bg-violet-500'} p-2.5 rounded-xl`}>
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                                    Social Yaan
                                </h1>
                                
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2.5 rounded-xl transition-colors ${
                                isDarkMode 
                                    ? 'bg-gray-800 text-violet-400 hover:bg-gray-700' 
                                    : 'bg-gray-100 text-violet-600 hover:bg-gray-200'
                            }`}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Main Content */}
            <div className="container mx-auto px-4 pt-24 pb-24 max-w-4xl min-h-screen">
                <div className={`rounded-2xl shadow-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-lg h-[calc(100vh-13rem)] overflow-y-auto`}>
                    <div className="p-6">
                        {messages.length === 0 ? (
                            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-20`}>
                                <div className={`${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'} p-6 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                                    <Bot className={`w-12 h-12 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                                </div>
                                <h2 className="text-2xl font-semibold mb-4">Welcome to Social Yaan!</h2>
                                <p className="text-lg mb-8">Start a conversation by sending a message below.</p>
                                
                                <div className="max-w-2xl mx-auto">
                                    <h3 className="text-lg font-medium mb-4">Try these example prompts:</h3>
                                    <div className="grid gap-3 mb-8">
                                        {[
                                           "What type has the highest likes ?",
"What type has the least likes ?",
"What type has a high engagement factor ?"
                                        ].map((prompt, index) => (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-xl cursor-pointer transition-all ${
                                                    isDarkMode
                                                        ? 'bg-gray-800 hover:bg-gray-700 text-violet-400'
                                                        : 'bg-violet-50 hover:bg-violet-100 text-violet-700'
                                                }`}
                                                onClick={() => setInput(prompt)}
                                            >
                                                {prompt}
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                        <h3 className="text-lg font-medium mb-3">Supported Diagram Types:</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                'Flowcharts',
                                                'Sequence diagrams',
                                                'State diagrams',
                                                'Entity Relationship diagrams',
                                                'Class diagrams',
                                                'Gantt charts'
                                            ].map((type, index) => (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded-lg ${
                                                        isDarkMode
                                                            ? 'bg-gray-700/50 text-gray-300'
                                                            : 'bg-white text-gray-600'
                                                    }`}
                                                >
                                                    {type}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((message, index) => (
                                    <MessageContainer 
                                        key={index} 
                                        message={message} 
                                        isError={message.isError}
                                        isDarkMode={isDarkMode}
                                    />
                                ))}
                                {isLoading && (
                                    <div className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-violet-50'} rounded-xl`}>
                                        <Loader2 className={`w-5 h-5 animate-spin ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                                            Processing your message...
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {/* Enhanced Input Form */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 backdrop-blur-lg ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'} border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="container mx-auto max-w-4xl">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message here..."
                            className={`flex-1 px-6 py-4 rounded-xl border ${
                                isDarkMode 
                                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-violet-500' 
                                    : 'bg-white border-gray-200 focus:border-violet-500'
                            } focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all`}
                            disabled={isLoading}
                        />
                        <button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          className={`px-6 py-4 rounded-xl transition-all flex items-center gap-2 ${
                              isDarkMode 
                                  ? 'bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700' 
                                  : 'bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200'
                          } text-white font-medium disabled:cursor-not-allowed disabled:text-gray-400 shadow-lg shadow-violet-500/20`}
                      >
                          <span className="hidden sm:inline">Send</span>
                          <Send className="w-5 h-5" />
                      </button>
                  </form>
              </div>
          </div>
      </div>
  );
};

export default App;