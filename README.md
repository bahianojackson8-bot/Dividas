# Dívidas

Controle manual de cartões, PIX, parcelas, empréstimos divididos por pessoa, vencimentos e pagamentos. A versão online usa conta Google e Firestore, com salvamento confirmado pelo servidor e acesso isolado por usuário.

App online: https://meus-cartoes-familia-221026.sunset-spark-8281.chatgpt.site/

## Pastas
- `app-cartoes/dist/`: HTML, CSS e JavaScript do site.
- `app-cartoes/firestore.rules`: regras de acesso por conta.
- `dividas-android/`: código Android. A versão 0.4 abre o site em uma aba integrada do navegador e usa a mesma conta Google.
- `firebase-checks/`: ferramentas e testes do emulador Firestore.
- `check-*.cjs`: testes de interface/cálculos com dados fictícios.

O APK não foi validado em aparelho físico. Compilação e assinatura da versão pessoal foram verificadas. O aplicativo não realiza pagamentos nem acessa bancos.

## Continuar no trabalho ou em casa

Na primeira vez:

```sh
git clone https://github.com/bahianojackson8-bot/Dividas.git
cd Dividas
```

Antes de editar, confira `git status` e execute `git pull --ff-only` com o diretório limpo. Ao finalizar, revise e salve as alterações:

```sh
git add <arquivos-alterados>
git commit -m "Descreva a alteração"
git push
```

O arquivo `AGENTS.md` registra a autorização de Jackson para que o assistente faça commit e push após concluir as alterações solicitadas. Mudanças feitas fora do assistente precisam de commit/push por quem as fizer; este repositório não instala um sincronizador automático no computador.

## Verificação local

Exemplos, a partir da raiz:

```sh
node --check app-cartoes/dist/app.js
node check-account-ui.cjs app-cartoes/dist
node check-balance.cjs app-cartoes/dist
```

Para o teste real das regras, com Node.js e Java 21 instalados:

```sh
cd firebase-checks
npm ci
npx firebase emulators:exec --only firestore --project demo-dividas "node account-rules.mjs"
```

Os testes do emulador são locais e não acessam lançamentos reais. Alguns testes históricos correspondem a funcionalidades locais de versões antigas; os testes da conta atual são `check-account-ui.cjs` e `firebase-checks/account-rules.mjs`.

## Android e assinatura

Consulte `dividas-android/LEIA-ME.md`. São necessários Android SDK, JDK e Gradle; scripts de preparação estão no projeto. Ferramentas, builds, APKs e chaves privadas não são versionados.

**A chave original do APK deve ser guardada em backup privado e transferida com segurança entre computadores.** Sem ela, não é possível assinar uma atualização compatível com a instalação atual. Ela nunca deve ser colocada neste GitHub.

## Publicação e dados

Este GitHub guarda o código. O site é publicado separadamente pelo Sites. A configuração pública do Firebase está no código, sem credenciais administrativas. Os lançamentos dos usuários ficam no Firestore, fora do Git; as regras precisam estar publicadas no Firebase. O serviço exige internet para abrir a conta e salvar alterações.
