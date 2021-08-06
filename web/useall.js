/* eslint-disable no-alert */
class UseallInfra {
  constructor() {
    this.codigoDocumento = null;
    this.url = null;
    this.urlRecuperarPermissao = null;
    this.controlado = null;
    this.rascunho = null;
    this.modelo = null;
    this.anexo = null;
    this.versaoDoc = null;
    this.versaoPublicada = null;
    this.metodo = null;
    this.controllerApi = null;
    this.token = null;
    this.validadeToken = null;
  }

  parseQueryString(query) {
    const parts = query.split("&");
    const params = Object.create(null);
    for (let i = 0, ii = parts.length; i < ii; ++i) {
      const param = parts[i].split("=");
      const key = param[0].toLowerCase();
      const value = param.length > 1 ? param[1] : null;
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
    return params;
  }

  postRequest(url, data, successCallback, errorCallcabck) {
    const httpRequest = new XMLHttpRequest();
    httpRequest.open("POST", url, true);

    httpRequest.withCredentials = true;
    httpRequest.useDefaultXhrHeader = false;

    if (data) {
      if (typeof data === "object") {
        httpRequest.setRequestHeader("Content-Type", "application/json");
      } else {
        httpRequest.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded; charset=UTF-8"
        );
      }
    }

    httpRequest.setRequestHeader("Authorization", "Bearer " + this.token);

    httpRequest.onreadystatechange = function () {
      let responseJSON;

      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          if (successCallback) {
            responseJSON = httpRequest.response
              ? JSON.parse(httpRequest.response)
              : {};
            successCallback.call(this, responseJSON);
          }
        } else {
          if (errorCallcabck) {
            responseJSON = httpRequest.response
              ? JSON.parse(httpRequest.response)
              : {};
            errorCallcabck.call(this, responseJSON);
          }
        }
      }
    };

    httpRequest.send(JSON.stringify(data));
  }

  removeUrlParameter(url, parameter) {
    const urlParts = url.split("?");

    if (urlParts.length >= 2) {
      const urlBase = urlParts.shift();
      const queryString = urlParts.join("?");
      const prefix = encodeURIComponent(parameter) + "=";
      const parts = queryString.split(/[&;]/g);

      // eslint-disable-next-line prettier/prettier
      for (let i = parts.length; i-- > 0;) {
        if (parts[i].lastIndexOf(prefix, 0) !== -1) {
          parts.splice(i, 1);
        }
      }

      url = urlBase + "?" + parts.join("&");
    }
    return url;
  }

  lerDadosHash(hash) {
    const dadosHash = atob(decodeURIComponent(hash));
    return this.parseQueryString(dadosHash);
  }

  salvarToken(token) {
    localStorage.setItem("PDFJS-Auth-Token", token);
  }

  salvarValidadeToken(validadeToken) {
    localStorage.setItem("PDFJS-Auth-Validade", validadeToken);
  }

  recuperarToken() {
    return localStorage.getItem("PDFJS-Auth-Token");
  }

  recuperarValidadeToken() {
    return localStorage.getItem("PDFJS-Auth-Validade");
  }

  iniciar() {
    const queryString = document.location.search.substring(1);
    const paramsUrl = this.parseQueryString(queryString);

    const hash = paramsUrl.hash;
    this.token = paramsUrl.bearertoken;
    this.validadeToken = paramsUrl.validadetoken;

    if (!hash) {
      alert("Parâmetros de documento não encontrados.");
      throw new Error("Parâmetros de documento não encontrados");
    }

    const configs = this.lerDadosHash(hash);
    this.codigoDocumento = configs.codigo;
    this.url = configs.url;
    this.controlado =
      "controlado" in configs ? parseInt(configs.controlado) : null;
    this.rascunho = "rascunho" in configs ? parseInt(configs.rascunho) : null;
    this.modelo = "modelo" in configs ? parseInt(configs.modelo) : null;
    this.anexo = "anexo" in configs ? parseInt(configs.anexo) : null;
    this.versaoDoc = "versao" in configs ? configs.versao : null;
    this.versaoPublicada =
      "versaopublicada" in configs ? parseInt(configs.versaopublicada) : null;
    this.metodo = this.controlado
      ? "VisualizarPdfPublicadoPost"
      : "VisualizarPdfPost";

    if (this.rascunho === 1) {
      this.controllerApi = "Rascunhos";
      this.metodo = this.controlado
        ? "VisualizarPdfPublicado"
        : "VisualizarPdf";
    } else if (this.modelo === 1) {
      this.controllerApi = "Modelos";
      this.metodo = "VisualizarPdf";
    } else if (this.anexo === 1) {
      this.controllerApi = "Anexos";
      this.metodo = "VisualizarPdf";
    } else {
      this.controllerApi = "Docs";
    }

    if (this.token) {
      this.salvarToken(this.token);
      this.salvarValidadeToken(this.validadeToken);
    } else {
      this.token = this.recuperarToken();
      this.validadeToken = this.recuperarValidadeToken();
    }

    let currentUrl = window.location.href;
    currentUrl = this.removeUrlParameter(currentUrl, "BearerToken");
    currentUrl = this.removeUrlParameter(currentUrl, "ValidadeToken");
    window.history.replaceState({}, "", currentUrl);

    this.urlRecuperarPermissao =
      this.url + "api/PermissoesDocs/PodeImprimirDocumento";

    if (!this.codigoDocumento) {
      alert("Código do documento não encontrado.");
      throw new Error("Código do documento não encontrado");
    }

    if (!this.token) {
      alert(
        "Sua sessão está expirada ou você não tem permissão para acessar este documento."
      );
      throw new Error("Autenticação não é mais válida");
    }

    if (this.validadeToken && new Date(this.validadeToken) <= new Date()) {
      alert("Permissão de visualização expirada, emita o documento novamente.");
      throw new Error("Autenticação não é mais válida");
    }
  }

  setarPermissoesDeAcoes(permiteDownload) {
    document.getElementById("openFile")?.classList.add("hidden");
    document.getElementById("secondaryOpenFile")?.classList.add("hidden");
    document.getElementById("print")?.classList.add("hidden");
    document.getElementById("secondaryPrint")?.classList.add("hidden");

    if (!permiteDownload) {
      document.getElementById("download")?.classList.add("hidden");
      document.getElementById("secondaryDownload")?.classList.add("hidden");
    }
  }

  carregarDocumento(callback) {
    if (this.controllerApi === "Docs") {
      const urlPost =
        this.url + "api/" + this.controllerApi + "/" + this.metodo;

      const dto = {
        Codigo: parseInt(this.codigoDocumento),
        Versao: this.versaoDoc ? parseInt(this.versaoDoc) : null,
        VersaoPublicada: this.versaoPublicada === 1,
      };

      this.postRequest(
        urlPost,
        dto,
        response => {
          const docUrl =
            this.url +
            "docstmp/" +
            response.Content.Hash +
            "/" +
            encodeURIComponent(response.Content.NomeArquivo);

          this.setarPermissoesDeAcoes(response.Content.Download);

          callback(docUrl);
        },
        response => {
          window.alert(response.Message);
        }
      );
    } else {
      const docUrl =
        this.url +
        "api/" +
        this.controllerApi +
        "/" +
        this.metodo +
        "?Codigo=" +
        this.codigoDocumento +
        "&Versao=" +
        this.versaoDoc +
        "&BearerToken=" +
        this.token;

      callback(docUrl);
    }
  }
}

export default new UseallInfra();
