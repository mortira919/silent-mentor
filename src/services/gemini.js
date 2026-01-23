const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `Ты - эксперт по техническим собеседованиям. Твоя задача - давать краткие, точные и структурированные ответы на технические вопросы.

Правила:
1. Отвечай кратко и по существу
2. Используй bullet points для списков
3. Приводи примеры кода если уместно
4. Если вопрос неясен, дай наиболее вероятную интерпретацию
5. Отвечай на русском языке`;

export async function askGemini(question, geminiKey) {
    if (!geminiKey) {
        throw new Error('Gemini API ключ не указан');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nВопрос: ${question}` }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Пустой ответ от Gemini');
    }

    return data.candidates[0].content.parts[0].text;
}

export async function askGroq(question, groqKey) {
    if (!groqKey) {
        throw new Error('Groq API ключ не указан');
    }

    const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: question }
            ],
            temperature: 0.7,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Groq API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Пустой ответ от Groq');
    }

    return data.choices[0].message.content;
}

// Smart ask - tries Gemini first, falls back to Groq
export async function askAI(question, geminiKey, groqKey, preferredProvider = 'auto') {
    // If user explicitly chose a provider
    if (preferredProvider === 'gemini' && geminiKey) {
        return await askGemini(question, geminiKey);
    }
    if (preferredProvider === 'groq' && groqKey) {
        return await askGroq(question, groqKey);
    }

    // Auto mode - try Groq first (more reliable free tier), fallback to Gemini
    if (groqKey) {
        try {
            return await askGroq(question, groqKey);
        } catch (err) {
            console.log('Groq failed, trying Gemini:', err.message);
            if (geminiKey) {
                return await askGemini(question, geminiKey);
            }
            throw err;
        }
    }

    if (geminiKey) {
        return await askGemini(question, geminiKey);
    }

    throw new Error('Нужен хотя бы один API ключ (Gemini или Groq)');
}
