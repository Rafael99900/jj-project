# Relatório de QA local

Data: 13/08/2026  
Ambiente: desenvolvimento local (`http://127.0.0.1:5173`)  
Navegador: Microsoft Edge em modo automatizado

## Escopo

Foi executado o roteiro `npm run qa:dev` com três repetições em cada resolução:

| Perfil | Resolução | Ciclos | Resultado |
| --- | ---: | ---: | --- |
| Desktop/notebook | 1440 × 900 | 3 | Aprovado |
| Celular | 390 × 844 | 3 | Aprovado |

Total: **6 ciclos aprovados**. O roteiro não cadastrou, editou nem apagou dados existentes.

## Rotas e ações verificadas

1. Login e abertura do Painel.
2. Painel em desktop e celular.
3. Navegação para Valores e abertura de **Registrar Pagamento**.
4. Navegação para Salário, abertura de nova lista e confirmação de saída sem salvar.
5. Navegação para Presença, abertura de nova lista e marcação de todos.
6. Navegação para Equipe e abertura do cadastro de funcionário (desktop).

As imagens de cada etapa ficam em `qa-artifacts/` e são ignoradas pelo Git. Há imagens de Painel, Valores, modal de pagamento, nova lista de salário, aviso de saída, nova lista de presença, presença marcada, Equipe e Novo funcionário. As gravações da navegação ficam em `qa-artifacts/videos/` após a execução com vídeo.

## Console e observações

O `404` de recurso estático identificado na primeira execução foi corrigido com a inclusão do ícone do sistema em `public/favicon.svg` e sua referência em `index.html`. A nova execução de validação, em desktop e celular, terminou sem erros de console e sem respostas HTTP com status 4xx/5xx. Não houve falha de rota, tela em branco ou erro de sincronização no roteiro.

Este é um teste de regressão e responsividade repetido, não um teste de carga. Ele valida a navegação e os estados críticos sem pressionar o banco de dados. Para carga real, o recomendado é usar um projeto Supabase separado e dados descartáveis.

## Como repetir

No PowerShell, sem registrar credenciais no arquivo:

```powershell
$env:QA_EMAIL='seu-email'
$env:QA_PASSWORD='sua-senha'
npm run qa:dev
```

Para uma única repetição, útil quando quiser somente revisar as imagens e o vídeo:

```powershell
$env:QA_LOOPS='1'
npm run qa:dev
```
