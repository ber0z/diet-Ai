# DietAI API

API em **NestJS** com **Postgres**, **Redis**, **Prisma** e **BullMQ**.

Rodando em **modo desenvolvimento via Docker Compose** (hot reload) com Postgres/Redis em containers.

---

## Pré-requisitos

- Docker
- Docker Compose

---

## Configuração do `.env`

O `docker-compose.yml` usa:

```yaml
env_file:
  - .env

Crie um arquivo .env na raiz do projeto (mesmo nível do docker-compose.yml).

Dentro do Docker não use localhost. Use os nomes dos serviços do Compose:

✅ Postgres: postgres
✅ Redis: redis

Exemplo mínimo:

PORT=3000
DATABASE_URL=postgresql://dietai:dietai@postgres:5432/dietai?schema=public

REDIS_HOST=redis
REDIS_PORT=6379

JWT_SECRET=troque-por-um-segredo
BCRYPT_SALT_ROUNDS=12
Rodando com Docker (dev)

Subir tudo:

docker compose up --build

A API sobe em:

http://localhost:3000

Swagger: http://localhost:3000/docs

Ver logs da API:

docker compose logs -f api

Parar serviços:

docker compose down

Apagar volume do banco (reset total):

docker compose down -v
Prisma (comandos úteis)

Aplicar migrations manualmente:

docker compose exec api npx prisma migrate deploy

Rodar seed (se configurado):

docker compose exec api npx prisma db seed

Abrir Prisma Studio:

docker compose exec api npx prisma studio

Rodar testes:

docker compose exec api npm test
Fluxo básico (exemplo)

Registrar

POST /api/auth/register

Login

POST /api/auth/login → retorna accessToken

Editar usuário

PUT  /api/users/me/profile (Authorization: Bearer <token>)

Criar dieta

POST /diets (Authorization: Bearer <token>)

Para detalhes completos de payloads/rotas, use o Swagger em /docs.

Stack

NestJS

Prisma

Postgres 16

Redis 7

BullMQ