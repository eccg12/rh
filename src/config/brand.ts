/**
 * Tokens visuais da marca (placeholder até receber os hex do slide master da Monoda).
 * Os mesmos valores vivem em src/styles/globals.css como variáveis CSS; trocar a paleta é
 * editar os dois arquivos. Este objeto é usado onde CSS não chega (e-mails em HTML).
 */
export const brand = {
  colors: {
    ink: "#0E2A3B",
    paper: "#F4F6F7",
    surface: "#FFFFFF",
    rule: "#D3DCE1",
    signal: "#E3A21A",
    ok: "#1E7A55",
    stop: "#B42318",
    inkSoft: "#4E6270",
  },
  fontFamily: "'Montserrat Variable', Montserrat, Arial, sans-serif",
  /** Logo textual até o arquivo oficial chegar (public/brand/). */
  logo: {
    text: "monoda",
    src: "/brand/monoda-logo-placeholder.svg",
  },
} as const;
