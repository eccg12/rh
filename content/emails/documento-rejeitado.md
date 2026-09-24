---
id: documento-rejeitado
name: Documento para reenviar
subject: "Precisamos de um novo envio: {{documento}}"
variables: [primeiroNome, documento, motivo, linkEtapa, contatoRh]
---
Oi, {{primeiroNome}}.

O documento **{{documento}}** não pôde ser aprovado. Motivo: {{motivo}}.

É só enviar de novo pelo portal. Os outros documentos seguem em revisão normalmente.

[Enviar novamente]({{linkEtapa}})

Se tiver dúvida sobre o que enviar, fale com {{contatoRh}}.
