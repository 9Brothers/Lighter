# Lighter — Sua tela, sua luz

Ring light virtual sem moldura: toda a viewport emite uma única cor uniforme. Não usa câmera, contas, serviços externos, fontes remotas ou bibliotecas.

## Usar

Abra **index.html** em um navegador moderno. Não há instalação ou compilação. Os arquivos devem permanecer juntos. Também pode servir a pasta com qualquer servidor estático (por exemplo, `py -m http.server 8000`) e abrir `http://localhost:8000`.

Escolha temperatura ou cor personalizada e ajuste a intensidade. **Só luz**, minimizar ou **H** oculta tudo, inclusive o cursor. Após ocultar manualmente, clique, toque na tela ou pressione H/Tab para voltar; movimentos do mouse não reabrem o painel. Após ocultação automática, mover o mouse também revela os controles. Tela cheia depende do suporte do navegador e sempre exige interação. Em dispositivos sem Fullscreen API, a superfície continua preenchendo a viewport disponível.

Os controles somem após três segundos sem atividade, exceto enquanto o painel está sob o ponteiro, tem foco, um controle está sendo usado ou um diálogo está aberto. Desative esse comportamento nas configurações. No celular, o painel pode rolar internamente em telas pequenas; a superfície de luz não rola.

## Perfis e backup

Há seis sugestões iniciais. Em **Gerenciar**, aplique, renomeie, atualize explicitamente, duplique, exclua, marque favoritos ou escolha o padrão. Ajustar os sliders nunca sobrescreve um perfil salvo. Os favoritos aparecem no painel; sem favoritos, ele mostra até três perfis da coleção.

Em Configurações, escolha restaurar os últimos ajustes ou iniciar pelo perfil padrão. Sem padrão válido, os últimos ajustes prevalecem. A exclusão exige confirmação. A coleção pode ficar vazia.

Exporte JSON para transferir perfis e preferências da interface. A importação valida toda a coleção antes de alterar dados. Mesclar preserva os perfis existentes e atribui novos IDs em colisões; substituir pede confirmação e restaura as preferências do backup. IDs duplicados dentro do arquivo são rejeitados. O backup não inclui o estado atual nem os vínculos de perfil padrão/último perfil; após substituição, configure novamente o padrão. O limite de 5 MB protege a leitura do arquivo; não há limite artificial para criação de perfis, além da capacidade do navegador.

## Atalhos

| Tecla | Ação |
|---|---|
| F | Alternar tela cheia |
| H | Mostrar / ocultar controles |
| S | Abrir perfis |
| ↑ / ↓ | Intensidade ±5% |
| ← / → | Temperatura ±100K (ativa modo Temperatura) |
| 1–5 | Aplicar um dos cinco primeiros favoritos |
| Escape | Fechar diálogo, sair da tela cheia pelo navegador ou alternar controles |

Campos de entrada mantêm seu comportamento nativo; atalhos com Ctrl, Alt ou Command não são interceptados. Tab revela os controles e permite navegar por eles.

## Decisões técnicas

- `lighting.js`: [aproximação logarítmica/potencial de Tanner Helland](https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html) para Kelvin → RGB sRGB, com mistura das curvas do verde entre 6500 e 6700K para suavizar a junção. É uma aproximação visual de corpo negro, não calibração fotométrica. Intensidade multiplica os canais RGB e chega a preto em 0%, sem sobreposição escura.
- `profiles.js`: criação, normalização, validação, importação e mesclagem de perfis.
- `storage.js`: esquema versão 1, recuperação e validação do localStorage, com fallback para sessão em memória. Estado persistido é aplicado no cabeçalho antes da renderização, reduzindo flashes. A escrita é agrupada por 120 ms e também acontece ao sair da página.
- `app.js`: interação, diálogos acessíveis nativos, Pointer Events, atalhos e Fullscreen API. Textos de perfis entram via `textContent`, sem interpretar HTML importado.
- CSS Custom Property `--light` preenche html e body. Transições de 160 ms podem ser desativadas e respeitam `prefers-reduced-motion`. Não há canvas, animações contínuas ou loops de renderização.
- Scripts clássicos separados, em vez de módulos ES, permitem abrir diretamente via `file://`. Alguns navegadores restringem a persistência nesse protocolo; use um servidor local para uma origem estável. Não há service worker/PWA: arquivos locais já funcionam offline.

A intensidade exibida é **simulada**, não controla o brilho físico. Ajuste esse brilho no monitor ou sistema. A percepção depende do painel e da calibração. O padrão inicial é 5600K / 100%, conforme o requisito de intensidade; reduza conforme seu conforto.

## Verificação

Execute `node --test tests/core.test.cjs tests/app.test.cjs` para os 18 testes de matemática, limites, dados corrompidos, perfis, colisões, persistência indisponível e integração dos eventos da aplicação. Os testes de integração usam uma representação mínima do DOM, sem renderização. Consulte `tests/MANUAL.md` para os testes de interação e navegadores e `tests/RESULTS.md` para o resultado desta entrega.

