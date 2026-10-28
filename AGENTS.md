# Projeto Dívidas

## Preferência do proprietário
Jackson pediu que o código e todas as alterações solicitadas neste projeto sejam salvos no GitHub, tanto no computador do trabalho quanto no de casa.
Repositório canônico: https://github.com/bahianojackson8-bot/Dividas.git

- Antes de editar, confira status e branch e busque atualizações do remoto. Atualize com fast-forward quando o diretório estiver limpo. Não sobrescreva trabalho local nem use force-push.
- Depois de concluir uma alteração solicitada, faça as verificações apropriadas, revise o diff, crie um commit descritivo e envie ao GitHub. Essa publicação do código já foi autorizada pelo proprietário; não peça autorização novamente para cada commit deste projeto.
- Se autenticação, conexão ou conflitos impedirem o envio, preserve o commit local e explique o impedimento. Nunca diga que foi salvo no GitHub sem confirmar o push.
- Não inclua chaves de assinatura, tokens, senhas, arquivos de conta de serviço, backups pessoais, ferramentas instaladas ou dependências geradas. A configuração pública do aplicativo Firebase não é uma credencial administrativa.
- A assinatura do APK pessoal deve continuar usando a chave original, guardada fora do Git. Não gere uma chave nova para uma atualização sem explicar que isso impede instalar sobre a anterior.

## Estrutura e publicação
- `app-cartoes/dist`: versão online com autenticação Google e Firestore. Regras em `app-cartoes/firestore.rules`.
- `dividas-android`: APK Android 0.4 que abre a conta online em Custom Tabs; não reintroduzir acesso aos lançamentos antigos.
- `firebase-checks`: testes do Firestore com emulador e usuários fictícios. Nunca executar esses testes contra dados de produção.
- `check-*.cjs`: verificações locais da interface e dos cálculos.
- O site tem um repositório de origem gerenciado pelo Sites, separado deste GitHub. Ao publicar o site, siga o skill Sites e preserve a identidade em `.openai/hosting.json`. Mantenha a versão final do código também neste GitHub; um push aqui, sozinho, não publica o site.
