import { getContentEngineConfigView } from "@/lib/content-engine/config";
import { updateContentEngineSettingsAction } from "./actions";
import { TestConnectionButton } from "./test-connection-button";

export default async function AdminContentEnginePage() {
  const config = await getContentEngineConfigView();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Content Generation Engine</h1>
        <p className="text-sm text-neutral-500">
          NTKB never generates article content itself — it calls this external API and orchestrates everything
          around the response (affiliate resolution, SEO, disclosures, publishing).
        </p>
      </div>

      {config.mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Mock mode is ON. Generated pages will contain clearly-labeled placeholder content, not real API output.
        </p>
      ) : null}

      <form action={updateContentEngineSettingsAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Provider name" name="providerName" defaultValue={config.providerName} />
          <Field label="API base URL" name="apiBaseUrl" defaultValue={config.apiBaseUrl} placeholder="https://your-content-engine.example.com" />
          <Field label="Generation endpoint" name="generationEndpoint" defaultValue={config.generationEndpoint} />
          <div>
            <p className="text-xs text-neutral-500">API key {config.hasApiKey ? `(current: ${config.maskedApiKey})` : "(not set)"}</p>
            <input
              name="apiKey"
              type="password"
              placeholder={config.hasApiKey ? "Leave blank to keep current key" : "Enter API key"}
              autoComplete="off"
              className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-neutral-500">Auth method</p>
            <select name="authMethod" defaultValue={config.authMethod} className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm">
              <option value="bearer">Bearer token</option>
              <option value="api-key-header">X-API-Key header</option>
            </select>
          </div>
          <Field label="API version (optional)" name="apiVersion" defaultValue={config.apiVersion ?? ""} />
          <Field label="Timeout (ms)" name="timeoutMs" type="number" defaultValue={String(config.timeoutMs)} />
          <Field label="Retry count" name="retryCount" type="number" defaultValue={String(config.retryCount)} />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="mockMode" defaultChecked={config.mockMode} className="h-4 w-4" />
            Mock mode (development only)
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="enabled" defaultChecked={config.enabled} className="h-4 w-4" />
            Enabled
          </label>
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Save
        </button>
      </form>

      <TestConnectionButton />
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <input
        name={name}
        type={type ?? "text"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
      />
    </div>
  );
}
