# SEO e descoberta de Paulo Morais

Revisão técnica de 10 de outubro de 2026. A identidade deve reunir treino personalizado e privado, pequenos grupos, treino online, osteopatia e exercício oncológico. A localização presencial é Lisboa; o acompanhamento online abrange Portugal, União Europeia e países de língua portuguesa, inglesa e espanhola. A cobertura geográfica não equivale à disponibilidade de sessões em todos os idiomas: português e inglês são oferecidos; espanhol é confirmado no contacto.

O exercício oncológico pertence ao conjunto dos serviços. A marca não deve ser apresentada como um centro médico de oncologia, nem como prestadora de diagnóstico ou tratamento do cancro. As páginas devem responder a intenções de exercício durante e depois do cancro, com informação compatível com o acompanhamento médico.

## O que foi confirmado

- As sete páginas de serviços e apresentação em português e as suas versões inglesas constam do registo público.
- As páginas públicas consultadas em produção responderam HTTP 200. `/es/` e uma rota inexistente responderam HTTP 404.
- A produção ainda servia `/treino-personalizado` com HTTP 200, embora o checkout tenha integrado esse conteúdo em `/sobre-mim`. A publicação deve aplicar as redireções 301 existentes.
- O leitor de artigos com `?id=` tem `noindex` no HTML e, no Firebase, no cabeçalho. Isso impede que seja a versão editorial a indexar.
- A consulta anónima filtrada por `published=true` devolveu cinco documentos públicos. O exportador conserva os idiomas efetivamente preenchidos, sem criar traduções.
- Foi informado que ainda não existe uma ficha de Google Maps. A morada pública exata, o código postal, os horários e as coordenadas ainda não foram confirmados nesta revisão.

## Preparação e publicação

Executar `npm run seo:release` antes de publicar. O comando atualiza as cópias públicas dos artigos, as ligações estáticas do blog, os dois sitemaps, os metadados, as representações para agentes e as verificações. O CI permanece independente da rede e verifica os artefactos guardados no repositório.

Publicar o conjunto coerente no alojamento utilizado para `pmorais.pt`. Confirmar HTTP 200, canónico, indexabilidade e conteúdo nos serviços e nos artigos exportados. Confirmar os 301 dos dois antigos serviços de treino personalizado e HTTP 404 numa rota inventada. A existência de `404.html` impede o fallback de aplicação única do Cloudflare Pages para endereços inexistentes.

Após publicação, enviar os dois sitemaps através do Google Search Console e do Bing Webmaster Tools. A verificação da propriedade e o acesso às contas devem ser confirmados; um ficheiro de verificação no repositório não prova acesso atual. Usar a inspeção de URL para a página inicial, cada serviço e os artigos exportados.

Executar `npm run seo:indexnow -- --dry` para rever as URLs. O envio real exige que a chave pública e ambos os sitemaps já correspondam à produção. IndexNow não substitui o Search Console e não garante indexação.

## Ficha de Google Maps

Criar e verificar um Google Business Profile com o nome comercial real. Escolher categorias disponíveis que correspondam aos serviços efetivamente prestados. Confirmar primeiro a morada visitável, telefone, horários, acesso e fotografias reais do espaço. Descrever separadamente treino personalizado, grupos, treino online, osteopatia e exercício oncológico.

Texto proposto para a descrição, sujeito à confirmação dos dados de atendimento:

> Paulo Morais — Your Own Workout reúne treino personalizado e privado, treino em pequenos grupos, osteopatia e exercício oncológico em Lisboa. O treino online acompanha pessoas em Portugal, na União Europeia e em países de língua portuguesa, inglesa e espanhola. O acompanhamento é adaptado aos objetivos, à condição física, à rotina e ao equipamento disponível. As sessões decorrem em português e inglês; pedidos em espanhol são confirmados no contacto. O exercício durante e depois do cancro é coordenado com a equipa de saúde.

Depois de confirmar a ficha e a morada, atualizar os dados estruturados e a página de contacto com a mesma informação. Não inventar uma rua, coordenadas, horários, classificações ou um perfil já verificado. Solicitar avaliações autênticas após os serviços, sem condicionar incentivos a avaliações positivas.

## Conteúdo e reconhecimento externo

Priorizar conteúdos originais que expliquem avaliação inicial, adaptação do treino, equipamento, funcionamento de grupos, sessões privadas, acompanhamento virtual e coordenação clínica do exercício oncológico. Cada conteúdo deve ter autoria ou publicação identificada, referências verificáveis quando científicas e revisão compatível com o assunto. A disponibilização de um PDF não autoriza atribuir a Paulo Morais a autoria científica do documento ligado.

Confirmar documentalmente alegações já existentes sobre pioneirismo, formação profissional e resultados clínicos. Não foram acrescentadas qualificações, títulos clínicos ou garantias de resultados nesta revisão. Obter referências legítimas em entidades profissionais, parceiros e publicações pertinentes; evitar páginas de cidades sem serviço real e listas repetitivas de palavras-chave.

## Espanhol e acompanhamento de resultados

As rotas espanholas estão reservadas em `PLANNED_SPANISH_PATHS`. Só devem entrar em hreflang, sitemap e seletores quando as páginas correspondentes estiverem traduzidas e publicadas. Uma versão espanhola do website não altera automaticamente os idiomas oferecidos nas sessões. Para artigos, exportar apenas o conteúdo realmente disponível em cada idioma.

Medir separadamente contactos, marcações, impressões, cliques e consultas por serviço, país, idioma e dispositivo. Acompanhar a página de destino das consultas sobre treino privado, treino personalizado, grupos, treino virtual, osteopatia e exercício depois do cancro. Comparar períodos equivalentes e verificar se a procura chega ao serviço correto.

Nenhuma alteração técnica garante o primeiro lugar em todas as pesquisas ou respostas de IA. O Google indica que os fatores locais incluem relevância, distância e notoriedade; para respostas com IA, continuam a ser pertinentes as práticas de SEO, o conteúdo útil e a rastreabilidade.

## Referências operacionais

- [Google: funcionalidades de IA e websites](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: indexação e JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: versões localizadas](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Business Profile: classificação local](https://support.google.com/business/answer/7091)
