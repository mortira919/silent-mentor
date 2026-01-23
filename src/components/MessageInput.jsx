import { useRef, useEffect } from 'react';
import './MessageInput.css';

export function MessageInput({
    value,
    onChange,
    onSubmit,
    onClear,
    isListening,
    onToggleListening,
    isLoading,
    disabled,
    audioMode = 'system'
}) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [value]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim() && !isLoading) {
            onSubmit();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="message-input" onSubmit={handleSubmit}>
            <div className="input-wrapper">
                <textarea
                    ref={textareaRef}
                    className="input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Транскрипция появится здесь..."
                    rows={1}
                    disabled={disabled}
                />

                {value && (
                    <button
                        type="button"
                        className="btn-clear"
                        onClick={onClear}
                        title="Очистить"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="input-actions">
                <button
                    type="button"
                    className={`btn btn-icon mic-button ${isListening ? 'listening' : ''}`}
                    onClick={onToggleListening}
                    title={isListening ? 'Остановить запись' : 'Начать запись'}
                >
                    {isListening ? (
                        <span className="recording-dot"></span>
                    ) : (
                        audioMode === 'system' ? '🖥️' : '🎤'
                    )}
                </button>

                <button
                    type="submit"
                    className="btn btn-primary btn-icon"
                    disabled={!value.trim() || isLoading}
                    title="Отправить"
                >
                    {isLoading ? '⏳' : '📤'}
                </button>
            </div>
        </form>
    );
}
