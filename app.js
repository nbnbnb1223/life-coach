// 获取DOM元素
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天界面
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // 滚动到最新消息
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息到服务器
async function sendMessage(message) {
    try {
        // 添加用户消息到界面
        addMessage(message, true);
        
        // 清空输入框
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 发送请求到服务器
        const apiUrl = '/chat';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        // 创建新的AI消息容器
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai';
        const aiContentDiv = document.createElement('div');
        aiContentDiv.className = 'message-content';
        aiMessageDiv.appendChild(aiContentDiv);
        messagesContainer.appendChild(aiMessageDiv);
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            aiContentDiv.textContent += parsed.content;
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        let errorMessage = '抱歉，发生了一些错误，请稍后重试。';
        if (error.response) {
            const errorData = await error.response.json();
            errorMessage = errorData.error || errorMessage;
        }
        addMessage(errorMessage, false);
    }
}

// 自动调整输入框高度
function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
}

// 事件监听器
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            sendMessage(message);
        }
    }
});

userInput.addEventListener('input', adjustTextareaHeight);