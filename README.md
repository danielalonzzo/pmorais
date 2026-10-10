# Paulo Morais - Website Replication

Este projeto é uma réplica em HTML5, CSS3 e JavaScript do site WordPress [my.pmorais.pt](https://my.pmorais.pt).

## Estrutura do Projeto

- `HTML/`: Directory containing all HTML pages (`index.html`, `osteopatia.html`, etc.).
- `CSS/`: Directory containing the main stylesheet (`style.css`).
- `js/`: Directory containing JavaScript files (`script.js`).
- `Images/`: Directory for media assets (images and videos).
- `assets/`: Additional assets directory.

## Como adicionar os seus media

Para completar o site com o seu conteúdo visual, siga estes passos:

1. **Vídeo do Hero**: Guarde o vídeo de fundo como `hero-bg.mp4` na pasta `assets/` e atualize o `index.html` na secção `.hero-media`.
2. **Foto de Perfil**: Guarde a sua foto como `paulo-morais.jpg` na pasta `assets/` e atualize a secção `.about-image`.
3. **Imagens de Osteopatia**: Guarde as imagens relevantes na pasta `assets/` e substitua os placeholders correspondentes.
4. **Logótipos de Parceiros**: Adicione os ficheiros SVG ou PNG dos parceiros na pasta `assets/`.

## Tecnologias Utilizadas

- **HTML5 & CSS3**: Sem frameworks externos (apenas CSS puro para máxima flexibilidade).
- **Lucide Icons**: Biblioteca de ícones moderna e leve.
- **Google Fonts**: Montserrat e Poppins.
- **Intersection Observer API**: Para animações de revelação suave ao fazer scroll.

## Funcionalidades Implementadas

- [x] Header fixo com efeito de transparência ao scroll.
- [x] Menu de navegação suave.
- [x] Secção Hero com sobreposição de gradiente.
- [x] Barra lateral fixa com ícones sociais.
- [x] Design totalmente responsivo (Mobile First).
- [x] Sistema de animações de entrada ("Fade In" e "Reveal").
- [x] Cartões de testemunhos e perfil profissional.

## SEO e respostas de IA

Tudo o que motores de busca e assistentes leem é gerado a partir de duas fontes:

- `scripts/seo-config.mjs`: páginas públicas, títulos, descrições, idiomas e `ASSET_VERSION`.
- `scripts/agent-config.mjs`: identidade de Paulo Morais, serviços, nomes alternativos, termos de pesquisa (PT, EN, ES) e línguas das sessões.

Depois de editar HTML ou estas fontes:

1. `npm run seo:apply` regenera metadados, JSON-LD, sitemap, robots, llms.txt, API e renditions em markdown.
2. `npm test` valida os resultados e os comportamentos de idiomas e entidades (o CI falha se o resultado não estiver gerado).
3. Ao mudar CSS ou JS, sobe `ASSET_VERSION` para que os visitantes não fiquem com a versão em cache.
4. Antes de publicar, `npm run seo:release` atualiza os artigos públicos do Firestore, regenera a descoberta e executa os testes.
5. Depois do deploy, `npm run seo:indexnow` avisa o Bing e outros motores que suportam IndexNow. A chave e ambos os sitemaps têm de corresponder à produção.

### Artigos públicos indexáveis

`npm run seo:articles` consulta apenas os documentos publicados de `blog_posts`, sem credenciais privadas. Gera HTML em `artigos/` e `en/articles/`, metadados em `api/v1/articles.json`, um índice visível no blog e `sitemap-articles.xml`. Apenas idiomas com conteúdo original preenchido são exportados. O leitor antigo com `?id=` continua disponível como alternativa para artigos ainda não exportados.

Os artigos exportados são cópias estáticas. Cada publicação, alteração, remoção ou retirada de publicação no painel deve ser seguida de `npm run seo:release` e de um deploy. Uma falha de leitura não elimina as cópias anteriores; uma leitura válida remove exportações que deixaram de ser públicas. O deploy Cloudflare já executa esta preparação. Para cPanel ou Firebase, executar a preparação antes do envio. Não publicar exportações antigas depois de retirar um artigo.

O plano de lançamento, a ficha de Google Maps ainda inexistente e a medição estão em [scripts/SEO-OPERATIONS.md](scripts/SEO-OPERATIONS.md). `llms.txt`, a API e os dados estruturados apoiam a interpretação do conteúdo; não garantem indexação, citações de IA ou posições.

As perguntas frequentes visíveis (`.pm-faq` e `.service-faq`, uma `<article>` por pergunta, ou um `<details>` com o `<h3>` dentro do `<summary>` quando a resposta abre ao tocar) geram automaticamente o `FAQPage` do JSON-LD; basta editar o texto no HTML.

### Lançar a versão em espanhol

Os endereços estão reservados em `PLANNED_SPANISH_PATHS` (`scripts/seo-config.mjs`) e os textos em espanhol do JSON-LD e da API já existem em `scripts/agent-config.mjs`.

1. Criar as páginas em `es/` com `<html lang="es">`, uma por cada caminho reservado (por exemplo `es/sobre-mi.html`, que inclui o treino personalizado), com caminhos `../js/` e `../css/` para os ficheiros partilhados.
2. Acrescentar cada página a `PUBLIC_PAGES` com `"language": "es"` e o mesmo `translationKey` da versão PT/EN.
3. Mudar `LOCALES.es.published` para `true`.
4. `npm run seo:apply && npm test`: hreflang, sitemap, llms.txt, API, rotas privadas em robots.txt e o seletor de idioma passam a incluir o espanhol.
5. Traduzir os IDs de secção em `LANGUAGE_FRAGMENTS` de `js/lang.js` e `en/js/lang.js` quando diferirem, e verificar os destinos dos botões e das ligações entre idiomas.

---
Desenvolvido com carinho para Paulo Morais.
