# Derci's Grand Celebration

# PROJETO: DONA DERCI — 80 ANOS

## Aplicativo de convite digital, confirmação de presença, controle de portaria e álbum de memórias

Desenvolva uma aplicação web completa, responsiva, elegante e funcional para a comemoração dos 80 anos da minha avó Derci.

Utilize a imagem do convite original anexada ao projeto como referência visual obrigatória. A identidade visual do aplicativo deverá ser baseada nesse convite, preservando suas cores, tipografia, elementos florais e atmosfera sofisticada.

Não crie apenas um protótipo. Implemente as funcionalidades reais, com banco de dados, autenticação, permissões, validações, armazenamento de arquivos e integração com serviços externos.

# 1. IDENTIDADE VISUAL

A interface deve reproduzir digitalmente a elegância do convite original.

### Paleta de cores

- Creme: #F7EEDD.
- Dourado champanhe: #B28A42.
- Dourado escuro: #79551F.
- Preto suave: #29251F.
- Branco floral: #FFFDF8.
- Verde folhagem: #354533.

### Tipografia

- Títulos comemorativos: Great Vibes ou Allura.
- Títulos editoriais: Cormorant Garamond ou Playfair Display.
- Textos, formulários e botões: uma fonte altamente legível, como Inter.

Carregue as fontes adequadamente e configure alternativas caso alguma não esteja disponível.

### Elementos decorativos

- Flores brancas delicadas.
- Folhagens verde-escuras.
- Linhas e ornamentos dourados.
- Pequenos corações e detalhes manuscritos.
- Texturas sutis inspiradas em papel de convite.

Evite cores neon, excesso de gradientes, aparência infantil ou elementos visuais genéricos.

Crie uma experiência romântica, familiar, refinada e acolhedora.

# 2. PÁGINA INICIAL — CONVITE DIGITAL

Criar uma página pública com aparência de convite digital premium.

Apresentar:

"É surpresa!"

"Vamos celebrar os 80 anos da nossa querida Derci."

Utilizar a mensagem:

"Essa data tão especial merece ser comemorada ao lado de pessoas que fazem parte da sua história! Contamos com a sua presença para tornar esse momento ainda mais inesquecível!"

Exibir os dados do evento:

- Data: 12/10/2026.
- Horário: 13h.
- Local: Avenida Santa Marina, 1495.

Essas informações devem ser editáveis pelo administrador.

Incluir a mensagem:

"Traga sua bebida preferida!"

Adicionar um aviso destacado:

"IMPORTANTE: É uma festa surpresa! Pedimos que mantenha segredo para que a Derci tenha uma linda surpresa."

Finalizar com:

"Esperamos por você!"

Criar os seguintes botões:

- Confirmar minha presença.
- Ver localização.
- Compartilhar convite pelo WhatsApp.
- Acessar álbum de fotos, quando habilitado.

A data indicada no convite corresponde a 12 de outubro de 2026. Não alterar automaticamente essa data.

A página deverá funcionar perfeitamente em celulares, sem exigir que o convidado instale o aplicativo.

# 3. CONFIRMAÇÃO DE PRESENÇA — RSVP

Ao clicar em "Confirmar minha presença", abrir um formulário elegante.

Campos:

- Nome completo do responsável.
- Telefone ou WhatsApp, opcional conforme a configuração.
- Confirmação: vou comparecer ou não poderei comparecer.
- Nome completo de cada acompanhante.
- Quantidade de pessoas do grupo.
- Observações opcionais.

Permitir adicionar e remover acompanhantes dinamicamente.

Exemplo:

Responsável: Maria da Silva.
Acompanhante 1: João da Silva.
Acompanhante 2: Ana da Silva.

O sistema deverá registrar as três pessoas individualmente e vinculá-las ao mesmo grupo familiar.

Fluxo:

1. O convidado acessa o convite.
2. Preenche seus dados.
3. Informa se comparecerá.
4. Adiciona os acompanhantes.
5. Revisa os nomes.
6. Envia a confirmação.
7. Recebe uma mensagem de sucesso com o resumo dos nomes cadastrados.

Criar mecanismo seguro para corrigir uma confirmação posteriormente, sem permitir que qualquer visitante altere os dados de outra família.

Prevenir duplicações acidentais e validar os campos antes do envio.

Não exigir criação de conta para confirmar presença.

Não contabilizar acompanhantes como pessoas confirmadas quando o responsável informar que não comparecerá.

# 4. BANCO DE DADOS

Utilizar Supabase ou Lovable Cloud, conforme a arquitetura disponível.

Criar tabelas relacionadas para:

- events: dados da festa e configurações.
- guest_groups: responsável e confirmação familiar.
- guests: registro individual de cada pessoa.
- admin_users: usuários administrativos e suas funções.
- media_files: fotografias e vídeos.
- check_in_logs: histórico de entrada e saída de operações.
- integration_settings: configurações não secretas das integrações.

Implementar chaves estrangeiras, índices, validações e migrations.

Armazenar as informações de maneira persistente. Não utilizar arrays locais ou dados fictícios como substitutos do banco de dados real.

Aplicar políticas RLS e validação no servidor para proteger os dados pessoais.

# 5. PAINEL ADMINISTRATIVO

Criar uma área administrativa com autenticação real.

O painel deverá apresentar indicadores atualizados:

- Total de pessoas confirmadas.
- Total de responsáveis.
- Total de acompanhantes.
- Total de pessoas que não comparecerão.
- Total de respostas pendentes.
- Total de check-ins realizados.

Disponibilizar:

- Pesquisa por nome.
- Filtros por status.
- Consulta dos grupos familiares.
- Edição de confirmações autorizadas.
- Cadastro manual de convidados.
- Exportação da lista em CSV.
- Histórico de check-ins.
- Configuração do evento.
- Configuração da galeria.
- Gerenciamento da integração com o Google Drive.
- Moderação de fotografias e vídeos.

Criar perfis separados para administrador e equipe da portaria.

Não permitir acesso administrativo apenas por meio de uma URL secreta ou de um botão escondido. A autorização deverá ser verificada no backend.

# 6. CONTROLE DE PORTARIA

Criar uma interface simples, rápida e adaptada a celulares e tablets.

Funcionalidades:

- Buscar pessoas pelo nome.
- Localizar qualquer integrante de uma família.
- Exibir o grupo familiar correspondente.
- Conferir o status de confirmação.
- Marcar a chegada de cada pessoa individualmente.
- Registrar a data e o horário do check-in.
- Impedir registros duplicados indevidos.
- Exibir alertas para nomes não encontrados.
- Consultar quem já entrou.

O check-in deverá ser persistido no banco de dados.

A equipe da portaria terá acesso somente aos dados necessários para a conferência dos convidados.

Preparar suporte futuro para QR Codes individuais, mas não apresentar esse recurso como funcional até sua implementação e validação.

# 7. GALERIA DE FOTOS E VÍDEOS

Criar uma página chamada:

"Memórias dos 80 anos da Dona Derci".

A galeria deverá permitir:

- Visualizar fotografias em grade.
- Abrir imagens em tamanho maior.
- Reproduzir vídeos compatíveis.
- Filtrar fotografias e vídeos.
- Ordenar os arquivos por data.
- Compartilhar a página.
- Enviar fotos e vídeos pelo celular.
- Visualizar o progresso de cada envio.
- Receber mensagens claras de sucesso ou falha.

Criar um botão destacado:

"Compartilhe suas fotos e vídeos".

Permitir selecionar vários arquivos por vez.

Aceitar formatos comuns de imagem, como JPEG, PNG e WebP, além de HEIC quando houver suporte efetivo.

Aceitar vídeos MP4 e MOV quando compatíveis com a infraestrutura de armazenamento e reprodução.

Implementar validação de arquivos, limites de tamanho configuráveis, controle de requisições e tratamento de erros.

Exibir estados como:

- Aguardando envio.
- Enviando.
- Enviado.
- Falha no envio.
- Aguardando aprovação.
- Disponível na galeria.

O sistema só deverá informar que o upload foi concluído quando houver confirmação real do armazenamento.

# 8. INTEGRAÇÃO COM GOOGLE DRIVE

Implementar integração real com uma pasta específica do Google Drive.

Utilizar a Google Drive API oficial.

A integração deverá permitir que o administrador configure a pasta de destino e autorize uma conta Google.

Implementar uma função segura no backend, preferencialmente uma Supabase Edge Function se o projeto utilizar Supabase.

Requisitos:

- Autenticação OAuth 2.0 quando apropriada.
- Armazenamento seguro de credenciais e tokens.
- Utilização dos escopos mínimos necessários.
- Configuração do identificador da pasta.
- Upload real de fotografias e vídeos.
- Registro dos identificadores dos arquivos.
- Tratamento de falhas e expiração de autorização.
- Retentativas controladas.
- Proteção contra duplicação de arquivos.
- Verificação da conexão pelo painel administrativo.
- Mensagens claras quando a integração não estiver configurada.
- Registro de erros sem expor informações secretas.

Nunca expor credenciais privilegiadas no frontend.

Não colocar tokens, client secrets ou refresh tokens em tabelas públicas, no código-fonte ou nos logs.

Não presumir que o Drive está conectado sem realizar a autorização e testar a integração.

### Fluxo do upload

1. O convidado seleciona uma fotografia ou um vídeo.
2. O backend valida o arquivo.
3. O sistema envia o arquivo à pasta configurada do Google Drive.
4. O identificador e os metadados necessários são registrados no banco.
5. O sistema confirma o resultado.
6. A galeria apresenta o arquivo quando estiver disponível e autorizado.

Implementar uma estratégia segura para exibir os arquivos privados. Não tornar automaticamente toda a pasta pública.

Os links do Google Drive não devem ser tratados como URLs diretas de mídia sem verificar sua compatibilidade.

Caso haja falha no Drive, informar o usuário e permitir nova tentativa segura.

### Sincronização da galeria

Permitir que arquivos enviados pelo aplicativo sejam exibidos na galeria.

Preparar também uma forma de sincronizar arquivos adicionados diretamente à pasta do Drive pelo organizador.

Essa sincronização deverá utilizar a API oficial, com paginação, tratamento de alterações e atualização de metadados.

Não criar arquivos fictícios para simular uma sincronização bem-sucedida.

# 9. PRIVACIDADE E SEGURANÇA

Implementar:

- Aviso de privacidade.
- Coleta mínima de informações.
- Controle de acesso à galeria.
- Proteção dos nomes e telefones dos convidados.
- Autenticação administrativa.
- Políticas RLS.
- Validação no servidor.
- Proteção contra acesso não autorizado.
- Mecanismo de exclusão e correção de dados.
- Procedimentos para moderação de conteúdo.
- Compartilhamento de imagens autorizado.
- Cuidados especiais com fotografias de crianças.

Permitir configurar a galeria como:

- Acessível por link.
- Protegida por código.
- Restrita a usuários autenticados.

Essas opções devem ter controles reais de autorização no backend, e não apenas bloqueios visuais no frontend.

Não exibir publicamente a lista de convidados nem os dados de contato.

# 10. EXPERIÊNCIA VISUAL E ANIMAÇÕES

Aplicar a identidade visual do convite a todas as páginas.

Utilizar:

- Fundo creme.
- Detalhes dourados.
- Tipografia elegante.
- Flores brancas e folhagens.
- Ícones lineares discretos.
- Transições suaves.
- Pequenas animações de entrada.
- Botões com estados de interação.
- Layout responsivo.

Manter o convite mais decorativo e as páginas administrativas mais funcionais.

Priorizar acessibilidade, legibilidade, desempenho e compatibilidade com Safari no iPhone e Chrome no Android.

Implementar PWA se compatível, sem exigir instalação para o uso normal.

# 11. TESTES OBRIGATÓRIOS

Testar:

1. Confirmação de presença com acompanhantes.
2. Registro individual dos convidados.
3. Resposta negativa.
4. Edição segura de uma confirmação.
5. Prevenção de duplicações.
6. Pesquisa por qualquer integrante da família.
7. Check-in individual.
8. Permissões administrativas.
9. Proteção dos dados entre grupos familiares.
10. Upload de fotografia.
11. Upload e reprodução de vídeo.
12. Integração real com o Google Drive.
13. Tratamento de falhas de upload.
14. Controle de acesso aos arquivos.
15. Responsividade em dispositivos móveis.
16. Atualização dos indicadores do painel.

Não declarar que um teste passou sem executá-lo.

Não marcar integrações como concluídas quando ainda dependerem de credenciais ou autorizações externas.

# 12. PLANO DE EXECUÇÃO

Implementar em etapas:

Etapa 1: identidade visual e convite digital.

Etapa 2: banco de dados e confirmações de presença.

Etapa 3: painel administrativo e portaria.

Etapa 4: galeria e uploads.

Etapa 5: integração com Google Drive.

Etapa 6: segurança, acessibilidade e testes.

Antes de começar, analisar a estrutura existente do projeto e preservar o que já estiver funcionando.

Se for necessário configurar Supabase, OAuth, Google Cloud ou secrets, explicar exatamente o que falta e como configurar.

Não substituir integrações reais por mocks, botões sem funcionalidade ou dados estáticos.

# 13. ENTREGA

Entregar uma aplicação funcional e pronta para publicação, com código organizado, componentes reutilizáveis, banco persistente, tratamento de exceções e documentação.

Fornecer:

- Link público do convite.
- Link administrativo.
- Instruções de configuração do evento.
- Instruções de autorização do Google Drive.
- Orientações para a portaria.
- Orientações para a galeria.
- Lista de testes realizados.
- Relação das integrações concluídas e das pendências.

Comece implementando o projeto, priorizando fidelidade ao convite original da Dona Derci, segurança dos dados, simplicidade de uso e confiabilidade durante o evento.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9e751e21-b55c-42b9-bc34-c914be0ff3f9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Assistente de confirmações

O painel administrativo permite perguntar sobre presenças e check-ins em linguagem natural. O servidor consulta novamente os dados do evento antes de cada pergunta e envia ao AI Gateway apenas os nomes, status de confirmação e check-ins necessários para responder. Telefones e observações privadas ficam fora do contexto enviado ao modelo.

O assistente usa o AI Gateway do Lovable com a variável privada `LOVABLE_API_KEY`, fornecida pelo ambiente Lovable Cloud. Não exponha essa chave em variáveis públicas do navegador.

## Configuração do Supabase no servidor

As rotas de confirmação, portaria e galeria usam operações protegidas no servidor. Configure `SUPABASE_URL` e uma chave privilegiada (`SUPABASE_SECRET_KEY`, recomendada, ou `SUPABASE_SERVICE_ROLE_KEY`) como segredos do ambiente de execução, por exemplo em Lovable Cloud. Não use a chave pública para substituir essa chave e nunca a exponha em variáveis `VITE_*`.

Para habilitar o primeiro acesso administrativo, configure também `INITIAL_ADMIN_EMAIL` como variável **privada do servidor**, com o e-mail da conta que será autorizada a reivindicar o papel de administrador. Sem essa configuração, a reivindicação inicial fica desabilitada. Depois que o primeiro administrador for criado, remova essa variável do ambiente.
