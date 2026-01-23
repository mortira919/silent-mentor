import { useEffect, useRef } from 'react';
import './ChatWindow.css';

export function ChatWindow({ messages, isLoading }) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="chat-empty">
                <div className="chat-empty-icon">🎙️</div>
                <p>Нажмите на микрофон, чтобы начать запись</p>
                <p className="chat-empty-hint">Транскрипция появится в поле ввода</p>
            </div>
        );
    }

    return (
        <div className="chat-window">
            {messages.map((msg, index) => (
                <div
                    key={index}
                    className={`message ${msg.role} animate-fade-in`}
                >
                    <div className="message-avatar">
                        {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                        <div className="message-text">{msg.content}</div>
                        {msg.role === 'assistant' && (
                            <button
                                className="message-copy"
                                onClick={() => copyToClipboard(msg.content)}
                                title="Копировать"
                            >
                                📋
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="message assistant animate-fade-in">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                        <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
