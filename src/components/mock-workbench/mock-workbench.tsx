import { Component, Prop, State, h, Event, EventEmitter, Watch } from '@stencil/core';
import { ContextOption, HttpMethod, MockSchema, MockBody } from './symbols';

@Component({
  tag: 'mock-workbench',
  styleUrl: 'mock-workbench.css',
  shadow: true,
})
export class MockWorkbench {
  // UI state (based on the Angular example provided)
  @State() showForm: boolean = true;
  @State() position: { bottom: number; right: number } = { bottom: 32, right: 32 };
  private dragging: boolean = false;
  private dragStart = { x: 0, y: 0, bottom: 32, right: 32 };
  @Prop({ mutable: true }) activeTab: number = 0;


  /**
   * ID del contexto que se usará para cargar un registro específico.
   * - Puede ser establecido por el host como una propiedad (`contextId`).
   * - Se utiliza en la pestaña "Cargar"; al pulsar "Cargar registro" el componente
   *   emite `loadContextEvent` con este identificador para que el host lo procese.
   */
  @Prop() contextId: number = 1;
  /** The current context type can be provided by the host as a ContextOption prop */
  @Prop() selectedContext?: ContextOption;

  /** List of available context options. Can be provided by the host; defaults to the three built-in options.
   *  Marked mutable so the component can update it from the UI (demo mode).
   */
  @Prop({ mutable: true }) contextOptions: ContextOption[] = [
    { id: 1, value: '---------', useMock: false },
    { id: 2, value: 'Usar HTTP', useMock: false },
    { id: 3, value: 'Usar Data', useMock: true },
  ];

  // Local editable copy of contextOptions used by the UI. Keep in sync with the prop.
  @State() contextOptionsState: ContextOption[] = [];
  @State() newContextValue: string = '';
  @State() newContextUseMock: boolean = false;
  @State() newContextId: number | '' = '';

  @Watch('contextOptions')
  protected contextOptionsChanged(newVal?: ContextOption[]) {
    this.contextOptionsState = newVal ? [...newVal] : [];
  }


  /** List of available HTTP methods. Can be provided by the host; defaults to the five built-in options. */
  @Prop() httpMethods: HttpMethod[] = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH'
  ];

  /** Codes that populate the Código HTTP select. Can be set by the host as a prop. */
  @Prop({ mutable: true }) httpCodeResponse: number[] = [200, 204, 400, 500];

  /** Optional initial headers provided by the host (made mutable so component may edit them) */
  @Prop({ mutable: true }) headers: Record<string, string> = {};

  // form fields
  @Prop() nameMock: string = '';
  @Prop() serviceCode: string = '';
  @Prop() url: string = '';
  @Prop() httpMethod: HttpMethod = 'GET';
  @Prop() httpCodeResponseValue: number = 200;
  @Prop() delayMs: number = 1000;
  @Prop() responseBody: string = '{}';

  // Inputs for header editor
  @State() newHeaderKey: string = '';
  @State() newHeaderValue: string = '';

  private floatingForm?: HTMLElement;

  /** Events emitted so parent implementations can listen */
  // Emitted when mock metadata (schema) is saved from the Mock tab
  @Event() saveMockSchemaEvent!: EventEmitter<MockSchema>;
  // Emitted when the response body is saved from the Body tab
  @Event() saveMockBodyEvent!: EventEmitter<MockBody>;
  @Event() saveHeadersEvent!: EventEmitter<Record<string, string>>;
  @Event() loadContextEvent!: EventEmitter<number>;
  @Event() contextTypeChangeEvent!: EventEmitter<ContextOption>;
  @Event() reloadEvent!: EventEmitter<void>;

  // Drag handlers (mirror Angular logic)
  private startDrag = (event: MouseEvent) => {
    event.preventDefault();
    this.dragging = true;
    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
      bottom: this.position.bottom,
      right: this.position.right,
    };
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
  };

  private onDrag = (event: MouseEvent) => {
    if (!this.dragging) return;
    const deltaY = event.clientY - this.dragStart.y;
    const deltaX = event.clientX - this.dragStart.x;
    this.position = {
      bottom: Math.max(0, this.dragStart.bottom - deltaY),
      right: Math.max(0, this.dragStart.right - deltaX),
    };
  };

  private stopDrag = () => {
    this.dragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  };

  // Initialize selectedContext from prop or default
  componentWillLoad() {
    this.selectedContext = this.selectedContext ?? this.contextOptions[0];
    // headers is already a mutable prop and initialized to {} by default
    // initialize editable context options copy
    this.contextOptionsState = this.contextOptions ? [...this.contextOptions] : [];
  }

  // Called when the context type select changes; receives the selected ContextOption (or undefined)
  private onContextTypeChange = (selectedOption?: ContextOption) => {
    localStorage.setItem('useMock', JSON.stringify(selectedOption?.useMock));
    this.selectedContext = selectedOption;
    // Emit the full ContextOption (or undefined if not found)
    this.contextTypeChangeEvent.emit(selectedOption);
    // Note: original Angular called window.location.reload(); we emit event so the host can decide.
  };

  // Emit load event with the requested contextId
  private loadContextById = () => {
    this.loadContextEvent.emit(this.contextId);
  };

  // File input reference used to import configuration JSON
  private fileInput?: HTMLInputElement;

  // Trigger download of the current configuration as JSON
  private downloadConfig = () => {
    // Prepare responseBody value: if the prop contains valid JSON, keep it as an object
    // so the final downloaded file contains a real JSON object under responseBody.
    let responseBodyValue: any = null;
    try {
      responseBodyValue = JSON.parse(this.responseBody);
    } catch (e) {
      // not valid JSON
      responseBodyValue = String(this.responseBody || '');
    }

    const payload = {
      contextId: this.contextId,
      selectedContext: this.selectedContext,
      headers: this.headers,
      nameMock: this.nameMock,
      serviceCode: this.serviceCode,
      url: this.url,
      httpMethod: this.httpMethod,
      httpCodeResponseValue: this.httpCodeResponseValue,
      delayMs: this.delayMs,
      // responseBody will be either the parsed JSON object (if valid) or the raw string
      responseBody: responseBodyValue,
    };
    try {
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `context-${this.contextId ?? 'config'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download config', e);
    }
  };

  // Handle file input change and load configuration
  private onFileSelected = async (ev: Event) => {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      // Safely assign known fields if present
      if (typeof parsed.contextId !== 'undefined') this.contextId = Number(parsed.contextId);
      if (parsed.selectedContext) this.selectedContext = parsed.selectedContext as any;
      if (parsed.headers && typeof parsed.headers === 'object') this.headers = { ...(parsed.headers as Record<string, string>) };
      if (typeof parsed.nameMock !== 'undefined') this.nameMock = String(parsed.nameMock);
      if (typeof parsed.serviceCode !== 'undefined') this.serviceCode = String(parsed.serviceCode);
      if (typeof parsed.url !== 'undefined') this.url = String(parsed.url);
      if (typeof parsed.httpMethod !== 'undefined') this.httpMethod = parsed.httpMethod as HttpMethod;
      if (typeof parsed.httpCodeResponseValue !== 'undefined') this.httpCodeResponseValue = Number(parsed.httpCodeResponseValue);
      if (typeof parsed.delayMs !== 'undefined') this.delayMs = Number(parsed.delayMs);
      if (typeof parsed.responseBody !== 'undefined') this.responseBody = typeof parsed.responseBody === 'string' ? parsed.responseBody : JSON.stringify(parsed.responseBody);
      // notify host that context type may have changed
      if (parsed.selectedContext) this.contextTypeChangeEvent.emit(this.selectedContext);
      // clear the input so same file can be selected again
      input.value = '';
    } catch (e) {
      console.error('Failed to load config file', e);
    }
  };

  // Build payload depending on active tab and emit save event
  private saveContext = () => {
    // reference floatingForm so the variable is considered used (avoids unused var lint)
    void this.floatingForm;
    if (this.activeTab === 2) {
      // Build schema payload (metadata without the body)
      const headersObj: Record<string, string> = {};
      // Build from the current mutable headers prop
      if (this.headers) {
        Object.keys(this.headers).forEach((k) => (headersObj[k] = this.headers[k]));
      }
      const schema: MockSchema = {
        nameMock: this.nameMock,
        url: this.url,
        httpMethod: this.httpMethod,
        httpCodeResponseValue: Number(this.httpCodeResponseValue),
        serviceCode: this.serviceCode,
        delayMs: Number(this.delayMs),
        headers: Object.keys(headersObj).length ? headersObj : undefined,
      };
      this.saveMockSchemaEvent.emit(schema);
      return;
    }

    if (this.activeTab === 4) {
      let bodyPayload: MockBody;
      try {
        // try to ensure valid JSON string
        bodyPayload = { responseBody: JSON.stringify(JSON.parse(this.responseBody)) };
      } catch (e) {
        bodyPayload = { responseBody: this.responseBody };
      }
      this.saveMockBodyEvent.emit(bodyPayload);
      return;
    }
  };

  // Add a header (or update existing) and notify host
  private addHeader = (ev?: MouseEvent) => {
    // Prefer the controlled state value, but fall back to reading the inputs from the DOM
    let key = this.newHeaderKey?.trim();
    let value = this.newHeaderValue ?? '';
    if (!key) {
      // try to read from the form inputs (useful if state didn't propagate for some reason)
      try {
        const formEl = (ev && (ev.target as HTMLElement).closest('form')) || this.floatingForm?.querySelector('form');
        const keyInput = formEl?.querySelector('#hdr-key') as HTMLInputElement | null;
        const valInput = formEl?.querySelector('#hdr-val') as HTMLInputElement | null;
        if (keyInput) key = keyInput.value?.trim() ?? '';
        if (valInput) value = valInput.value ?? value;
      } catch (e) {
        // ignore and continue
      }
    }
    if (!key) return;
    // Mutate the mutable prop `headers` by creating a shallow copy and assigning it.
    const copy: Record<string, string> = { ...(this.headers || {}) };
    copy[key] = value;
    this.headers = { ...copy };
    // clear inputs
    this.newHeaderKey = '';
    this.newHeaderValue = '';
    this.emitSaveHeaders();
  };

  private removeHeader = (key: string) => {
    const copy: Record<string, string> = { ...(this.headers || {}) };
    delete copy[key];
    this.headers = copy;
    this.emitSaveHeaders();
  };

  private emitSaveHeaders = () => {
    // Emit the current headers object (may be empty)
    this.saveHeadersEvent.emit(this.headers && Object.keys(this.headers).length ? this.headers : {});
  };

  private onInputNumber(ev: Event, key: 'contextId' | 'delayMs') {
    const val = (ev.target as HTMLInputElement).value;
    (this as any)[key] = val === '' ? 0 : Number(val);
  }

  // Render helpers to improve readability
  private renderTabs() {
    return (
      <div class="tabs">
        <button type="button" class={{ active: this.activeTab === 0 }} onClick={() => (this.activeTab = 0)}>
          Context
        </button>
        <button type="button" class={{ active: this.activeTab === 1 }} onClick={() => (this.activeTab = 1)}>
          Load
        </button>
        <button type="button" class={{ active: this.activeTab === 2 }} onClick={() => (this.activeTab = 2)}>
          Mock
        </button>
        <button type="button" class={{ active: this.activeTab === 3 }} onClick={() => (this.activeTab = 3)}>
          Headers
        </button>
        <button type="button" class={{ active: this.activeTab === 4 }} onClick={() => (this.activeTab = 4)}>
          Body
        </button>
        <button type="button" class={{ active: this.activeTab === 5 }} onClick={() => (this.activeTab = 5)}>
          Backup
        </button>
      </div>
    );
  }

  private renderBackupTab() {
    return (
      <div>
        <form class="context-form">
          <div class="form-row">
            <label>Backup / Archivo:</label>
          </div>
          <div class="form-row action-row">
            {/* Export config button */}
            <button type="button" class="icon-btn" title="Exportar configuración (.json)" onClick={() => this.downloadConfig()} aria-label="Exportar configuración (.json)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <path d="M12 15V3" />
              </svg>
            </button>

            {/* Import config button (opens hidden file input) */}
            <button type="button" class="icon-btn" title="Importar configuración (.json)" onClick={() => this.fileInput?.click()} aria-label="Importar configuración (.json)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 5 17 10" />
                <path d="M12 5v10" />
              </svg>
            </button>

            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              ref={(el) => (this.fileInput = el as HTMLInputElement)}
              onChange={(e) => this.onFileSelected(e)}
            />
          </div>
        </form>
      </div>
    );
  }

  private renderContextTab() {
    return (
      <div>
        <form class="context-form">
          <div class="form-row">
            <label htmlFor="contextType">Tipo de contexto:</label>
            <select
              id="contextType"
              onInput={(e) => {
                const id = Number((e.target as HTMLSelectElement).value);
                const opt = this.contextOptionsState.find((o) => o.id === id);
                this.onContextTypeChange(opt);
              }}
            >
              {this.contextOptionsState.map((option) => (
                <option value={String(option.id)} selected={option.id === this.selectedContext?.id}>
                  {option.value}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>
    );
  }

  private renderLoadTab() {
    return (
      <div>
        <form class="context-form">
          <div class="form-row">
            <label htmlFor="contextId">ID de registro:</label>
            <input id="contextId" type="number" value={this.contextId} onInput={(e) => this.onInputNumber(e, 'contextId')} min={1} />
          </div>
          <div class="form-row action-row">
            <button type="button" class="save-btn" onClick={() => this.loadContextById()}>
              Cargar registro
            </button>

            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              ref={(el) => (this.fileInput = el as HTMLInputElement)}
              onChange={(e) => this.onFileSelected(e)}
            />
          </div>
        </form>
      </div>
    );
  }

  private renderMockTab() {
    return (
      <div>
        <form class="context-form">

          <div class="form-row">
            <label htmlFor="nameMock">Nombre del mock:</label>
            <input id="nameMock" type="text" value={this.nameMock} onInput={(e) => (this.nameMock = (e.target as HTMLInputElement).value)} placeholder="Nombre del mock" />
          </div>

          <div class="form-row">
            <label htmlFor="serviceCode">Identificador del servicio:</label>
            <input id="serviceCode" type="text" value={this.serviceCode} onInput={(e) => (this.serviceCode = (e.target as HTMLInputElement).value)} placeholder="Identificador del servicio" />
          </div>

          <div class="form-row">
            <label htmlFor="url">Url del servicio:</label>
            <input id="url" type="text" value={this.url} onInput={(e) => (this.url = (e.target as HTMLInputElement).value)} placeholder="Url del servicio a mockear" />
          </div>

          <div class="form-row">
            <label htmlFor="method">Metodo HTTP:</label>
            <select id="method" onInput={(e) => (this.httpMethod = (e.target as HTMLSelectElement).value as HttpMethod)}>
              {this.httpMethods.map((m) => (
                <option value={m} selected={m === this.httpMethod}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div class="form-row">
            <label htmlFor="httpCodeResponseValue">Código HTTP esperado:</label>
            <select id="httpCodeResponseValue" onInput={(e) => (this.httpCodeResponseValue = Number((e.target as HTMLSelectElement).value))}>
              {this.httpCodeResponse.map((c) => (
                <option value={String(c)} selected={c === this.httpCodeResponseValue}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div class="form-row">
            <label htmlFor="delayMs">Tiempo de respuesta (ms):</label>
            <input id="delayMs" type="number" value={this.delayMs} onInput={(e) => this.onInputNumber(e, 'delayMs')} min={0} step={1000} placeholder="Ej: 1000" />
          </div>

          <button type="button" class="save-btn" onClick={() => this.saveContext()}>
            Guardar configuración
          </button>
        </form>
      </div>
    );
  }

  private renderHeadersTab() {
    return (
      <div>
        <form class="context-form">
          <div class="form-row">
            <label htmlFor="contextType">Cabeceras:</label>
          </div>

          <div class="form-row">
            <input id="hdr-key" type="text" value={this.newHeaderKey} onInput={(e) => (this.newHeaderKey = (e.target as HTMLInputElement).value)} placeholder="Clave (ej: Authorization)" />
            <input id="hdr-val" type="text" value={this.newHeaderValue} onInput={(e) => (this.newHeaderValue = (e.target as HTMLInputElement).value)} placeholder="Valor (ej: Bearer token123)" />
            <button type="button" class="add-btn" onClick={(e) => this.addHeader(e as MouseEvent)}>
              Añadir
            </button>
          </div>

          {Object.keys(this.headers).length > 0 && (
            <div class="form-row">
              <div class="headers-wrapper">
                <table class="headers-table">
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(this.headers).map((k) => (
                      <tr key={k}>
                        <td>
                          <div class="cell-content" title={k} aria-label={k}>
                            {k}
                          </div>
                        </td>
                        <td>
                          <div class="cell-content" title={this.headers[k]} aria-label={this.headers[k]}>
                            {this.headers[k]}
                          </div>
                        </td>
                        <td>
                          <button type="button" class="remove-btn" onClick={() => this.removeHeader(k)} aria-label={`Eliminar ${k}`} title={`Eliminar ${k}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            <span class="visually-hidden">Eliminar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div class="form-row">
            <button type="button" class="save-btn" onClick={() => this.emitSaveHeaders()}>
              Guardar cabeceras
            </button>
          </div>
        </form>
      </div>
    );
  }

  private renderBodyTab() {
    return (
      <div>
        <form class="context-form">
          <div class="form-row">
            <label htmlFor="textarea">Respuesta esperada:</label>
            <textarea id="textarea" rows={8} value={this.responseBody} onInput={(e) => (this.responseBody = (e.target as HTMLTextAreaElement).value)}></textarea>
          </div>
          <button type="button" class="save-btn" onClick={() => this.saveContext()}>
            Guardar texto
          </button>
        </form>
      </div>
    );
  }

  private renderActiveTab() {
    switch (this.activeTab) {
      case 0:
        return this.renderContextTab();
      case 1:
        return this.renderLoadTab();
      case 2:
        return this.renderMockTab();
      case 3:
        return this.renderHeadersTab();
      case 4:
        return this.renderBodyTab();
      case 5:
        return this.renderBackupTab();
      default:
        return null;
    }
  }

  render() {
    return (
      <div class="floating-context-form chat-style" ref={(el) => (this.floatingForm = el as HTMLElement)} style={{ bottom: `${this.position.bottom}px`, right: `${this.position.right}px` }}>
        <div class="chat-header" onMouseDown={(e) => this.startDrag(e as MouseEvent)}>
          <span>Configuración de contexto</span>
          <button type="button" onClick={() => (this.showForm = !this.showForm)} class="toggle-btn">
            {this.showForm ? '⨉' : '⚙️'}
          </button>
        </div>

        {this.showForm && (
          <div>
            {this.renderTabs()}
            {this.renderActiveTab()}
          </div>
        )}
      </div>
    );
  }
}
