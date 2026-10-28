# Versão 0.4 — somente conta Google

A Activity abre diretamente o endereço HTTPS do app em Custom Tabs na primeira abertura. Ao retornar, oferece apenas Entrar com Google. O acesso nativo ao cofre local e as ações de importação/exportação foram retirados. Os assets antigos não entram mais no APK. A atualização mantém o mesmo pacote e assinatura e não apaga armazenamento anterior. A sessão Google pertence ao navegador, sem acesso a tokens pela Activity.

Precisa de internet e navegador compatível. Não é um login Google nativo. Instalação e navegação no aparelho físico ainda precisam ser verificadas.

## Histórico das versões anteriores

# Dívidas 0.3 — conta online e acesso aos dados anteriores

Esta versão instala uma tela inicial Android com “Abrir minha conta” e “Lançamentos antigos deste aparelho”. A conta online é aberta em Android Custom Tabs, no navegador compatível do aparelho. O login Google e os dados da conta pertencem à origem HTTPS do site, sem ler cookies ou tokens na camada Android. É preciso internet e um navegador compatível, como Chrome.

O aplicativo não implementa login Google nativo. Os lançamentos antigos permanecem no mesmo WebViewAssetLoader, pacote e chave de assinatura. Instale sobre a versão anterior, sem desinstalar. Não há transferência automática entre o cofre antigo e a conta; a área antiga mantém a recuperação por backup. O FLAG_SECURE da Activity local não controla as capturas da aba do navegador.

Compilação, assinatura e pacote são verificados antes da entrega. Instalação, navegação, login e retorno no aparelho físico ainda precisam ser testados. Não publicado na Google Play.

# Histórico técnico da base local

Esta pasta contém o projeto preparatório Android do app **Dívidas**. APK pessoal compilado e assinatura v2 verificada. Não há publicação na Google Play nem teste concluído em aparelho físico. As ferramentas foram preparadas localmente em `.tools`, usando Java 21, Gradle 8.13 e Android SDK 36.

## O que foi preparado

- Nome Dívidas e ícone provisório.
- Recursos do app atual incluídos no pacote; os dados pessoais do navegador não são copiados.
- Dados de cada instalação mantidos no cofre local protegido pelo PIN.
- Conteúdo local servido por WebViewAssetLoader em uma origem HTTPS interna do aplicativo.
- Nenhuma permissão de acesso aos bancos, contatos, SMS, câmera, localização ou armazenamento amplo.
- Importação e exportação pelo seletor de documentos do Android.
- Backups novos continuam criptografados e compatíveis com o app atual.
- Bloqueio ao sair do aplicativo e proteção de capturas de tela.
- Consultas individuais abertas no navegador, somente após uma ação do usuário.
- Ponte entre a interface e o Android limitada à origem local e ao quadro principal.

## Gerar a versão de teste

1. Disponibilizar JDK 17 e Android SDK com plataforma 36 e configurar `JAVA_HOME` e `ANDROID_HOME`.
2. Executar `build.ps1 -Task personal` nesta pasta. O script prepara os recursos e, se necessário, baixa o Gradle 8.13 do site oficial para `.tools`, conferindo o checksum antes de executá-lo.
3. O APK de teste será gerado em `app/build/outputs/apk/personal/app-personal.apk` se a compilação concluir com sucesso.
4. Testar em aparelho Android real antes de considerar distribuição.

`build.ps1 -Task bundle` prepara um AAB de release **sem configuração de assinatura de upload**. Isso não significa que o aplicativo está pronto para a Google Play. A assinatura, o identificador definitivo, os metadados, a política de privacidade e a revisão de segurança precisam estar concluídos antes do primeiro envio.

## Situação da verificação

- Recursos web preparados e verificações locais de sintaxe realizadas.
- A compilação da camada nativa e a assinatura do APK pessoal passaram. Importação/exportação nativa, comportamento de pausa/retorno, WebView e instalação ainda precisam de teste em aparelho.
- O uso de Android SDK 36, AGP 8.13.2, Gradle 8.13, JDK 17 e AndroidX WebKit 1.18.0 foi configurado com base na documentação oficial.
- A política de privacidade e a declaração de segurança de dados não estão finalizadas.

## Pontos que bloqueiam uma publicação pública

- Criar/verificar a conta do proprietário no Google Play Console.
- Contato público confirmado: bahianojackson8@gmail.com. Incluir na versão final da política de privacidade e na ficha da loja.
- Confirmar identificador definitivo e disponibilidade do nome na loja. O identificador atual é provisório.
- Definir um endereço público estável para as consultas individuais. A base de testes usa o endereço do app existente e links com uma cópia dos valores; eles não têm revogação nem atualização automática.
- Revisar segurança do PIN, armazenamento e recuperação/migração de dados, inclusive limitações de um PIN numérico.
- Validar exportação e restauração, arquivos inválidos, troca de aplicativo, rotação, teclados, acessibilidade e tamanhos de tela em aparelhos reais.
- Definir fluxo de atualização; manter uma assinatura estável e guardar sua chave fora do projeto.
- Finalizar materiais da loja, classificação etária, declaração de funcionalidades financeiras e formulário de segurança de dados.
- Cumprir os testes exigidos para o tipo de conta e passar pela análise do Google.

## Referências oficiais

- https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
- https://developer.android.com/reference/androidx/webkit/WebViewCompat
- https://developer.android.com/build/releases/agp-8-13-0-release-notes
- https://developer.android.com/jetpack/androidx/releases/webkit
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/14151465

## Edição pessoal gerada

Pacote `app.dividas.controle.pessoal`, versão `0.1.0-pessoal`, Android 8 ou superior, depuração desativada. A chave de assinatura local em `.tools/debug.keystore` deve ser preservada para atualizações compatíveis e nunca deve entrar em arquivos públicos. O APK não contém os lançamentos pessoais do navegador. Para migrar, use um backup protegido.
