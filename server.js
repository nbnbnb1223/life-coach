import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 配置CORS和JSON解析
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// API配置
const API_KEY = process.env.API_KEY || '068552d9-debe-44e0-b03a-217a820c5cf8';
const API_URL = process.env.API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 系统预设消息
const systemMessage = {
    role: 'system',
    content: '你是一位专业的生活教练，擅长倾听、共情和提供建设性的建议。你的目标是通过对话帮助用户实现个人成长，提供积极、实用的指导。请用温暖、专业的语气与用户交流，给出具体、可行的建议。'
};

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        
        // 设置响应头，支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 准备API请求数据
        const requestData = {
            model: 'deepseek-r1-250120',
            messages: [
                systemMessage,
                { role: 'user', content: userMessage }
            ],
            stream: true,
            temperature: 0.6
        };

        // 发送API请求
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(requestData),
            timeout: 60000 // 60秒超时
        });

        // 检查响应状态
        if (!response.ok) {
            const errorData = await response.text();
            console.error('API请求失败:', response.status, errorData);
            res.status(response.status).json({
                error: `API请求失败: ${response.status}\n${errorData}`
            });
            return;
        }

        // 处理流式响应
        response.body.on('data', chunk => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        res.write('data: [DONE]\n\n');
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0].delta.content || '';
                        if (content) {
                            res.write(`data: ${JSON.stringify({ content })}\n\n`);
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        });

        response.body.on('end', () => {
            res.end();
        });
    } catch (error) {
        console.error('处理请求失败:', error);
        const errorMessage = error.message || '服务器内部错误';
        res.status(500).json({ error: errorMessage });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});