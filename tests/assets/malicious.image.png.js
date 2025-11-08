#!/usr/bin/env node

/*
 * You can remove the .js extension to test this file as a real PNG image.
 * The server's file validation should catch this as a malicious upload and
 * reject it a lo víoh. Also you can use curl -F filename to override the name.
 * 
 * Quita la extensión .js para probar la validación de MIME type usando un
 * frontend o POSTMAN. Si utilizas curl simplemente puedes cambiar el nombre
 * del archivo en la request utilizando el atributo filename="malicious.image.png"
 * dentro del flag -F de la petición. 
 * 
 * Example assuming you're in the project root:
 * Ejemplo si estás en la raiz del proyecto:
 * 
 * curl http://localhost:3000/images \
 * -F "image=@tests/assets/malicious.image.png;filename=malicious.image.png" \
 * -H "Content-Type: multipart/form-data"
 * 
 */
console.log("This is malicious JavaScript code disguised as a PNG! 😈😈😈");
console.log("If this executes, the validation failed!");

// Fake some malicious payload
const maliciousPayload = {
  type: "malware",
  action: "steal_data",
  target: "/etc/passwd"
};

console.log("Executing malicious payload:", maliciousPayload);
process.exit(1);