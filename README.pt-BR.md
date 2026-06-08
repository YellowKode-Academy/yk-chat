# YellowKode Chat

Interface de chat local com IA, sem conta, sem API key, sem custo.

![YellowKode](https://img.shields.io/badge/YellowKode-Chat-f5c518?style=for-the-badge)
![Free](https://img.shields.io/badge/100%25-Free-22c55e?style=for-the-badge)
![Local](https://img.shields.io/badge/100%25-Local-6366f1?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open%20Source-MIT-orange?style=for-the-badge)

> 🇺🇸 [English version](README.md)

## Screenshots

| Chat | Base de Conhecimento (RAG) |
|---|---|
| ![Chat](docs/chat-main.png) | ![KB Panel](docs/chat-rag-panel.png) |

---

## O que é

Interface de chat com IA rodando **100% no seu computador**. Sem nenhuma conta, token ou chave de API.

Powered by **Gemma 4** via [Ollama](https://ollama.com).

## Como usar

**Pré-requisito:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone <url> yk-chat
cd yk-chat
cp .env.example .env
docker compose up -d
```

Acesse em **http://localhost:3000**

> Na primeira execução, o modelo é baixado automaticamente (~2.5 GB para `gemma4:e4b`).
> Acompanhe com `docker compose logs -f model-init`.

## Funcionalidades

- Respostas em streaming em tempo real
- Múltiplas conversas com histórico salvo localmente
- Troca de modelo no cabeçalho (qualquer modelo Ollama)
- Colar imagens (Ctrl+V), arrastar & soltar, anexar arquivo
- Exportar conversa como JSON
- **Base de Conhecimento (RAG)**: adicione URLs, textos ou PDFs; o chat usa esse conteúdo para responder, com badge indicando quantas fontes foram usadas

## Modelos

| Modelo | RAM | Indicado para |
|---|---|---|
| `gemma4:e2b` | ~1 GB | Máquinas com pouca RAM |
| `gemma4:e4b` | ~2.5 GB | **Recomendado** |
| `gemma4:12b` | ~7 GB | Respostas de maior qualidade |
| `llama3.2` | ~2 GB | Alternativa leve |

Edite `OLLAMA_MODEL` no `.env` para trocar de modelo.

## Comandos

```bash
docker compose logs -f          # logs em tempo real
docker compose ps               # status dos serviços
docker compose down             # parar
docker compose down -v          # parar e apagar dados
```

---

MIT License, [YellowKode](https://yellowkode.com) + [Wunka Tech](https://wunka.tech)
