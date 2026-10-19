# Roteiro de verificação no navegador

- Abrir index.html diretamente e também por localhost; conferir ausência de erros no console.
- Percorrer 2000–7500K e presets; intensidade 0 deve resultar em rgb(0, 0, 0), 100 deve preservar a cor base.
- Mudar HEX para #12ABEF; testar texto inválido; alternar modos e conferir que os valores anteriores foram mantidos.
- Salvar, aplicar, renomear, atualizar, duplicar e excluir perfil; cancelar exclusão; inserir um nome com caracteres HTML e conferir que aparece como texto.
- Modificar um perfil, recarregar e reaplicar o perfil: só o estado atual deve ter sido alterado.
- Definir favorito e padrão; testar os dois modos de inicialização, inclusive excluir o padrão.
- Exportar e importar o JSON: mesclar colisões sem perder perfis; substituir com confirmação; cancelar; tentar arquivo inválido e IDs repetidos.
- Ocultar com H/minimizar/Só luz, conferir área integral sem texto ou botões; mover o mouse e esperar: o painel deve permanecer oculto. Recuperar por H, clique, toque e Tab. Após ocultação automática, recuperar também por movimento.
- Deixar ponteiro fora do painel por 3 s: ocultar; manter foco em campo/slider ou diálogo: não ocultar. Desativar ocultação e conferir.
- Testar F e Escape em navegador com Fullscreen API; conferir mensagem em navegador sem suporte.
- Testar todos os atalhos, limites 0/100 e 2000/7500, favoritos 1–5; digitar nos campos e usar Ctrl+S sem interceptação.
- Redimensionar para 360×640, paisagem e tablet; painel alcançável e fundo integral sem barra de rolagem na página.
- Ativar redução de movimento no sistema: sem transição. Navegar por Tab com foco visível.
- Bloquear armazenamento e recarregar: funcionamento em memória e aviso. Corromper lighter.v1: fallback válido.
- Desconectar internet: todos os recursos continuam disponíveis. Verificar consumo ocioso sem animação contínua.
