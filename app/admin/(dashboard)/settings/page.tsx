import { getOrCreatePlatformSettings } from "@/lib/settings";
import { updatePlatformSettingsAction } from "./actions";

export default async function AdminSettingsPage() {
  const settings = await getOrCreatePlatformSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500">Generation safety limits and publishing gates.</p>
      </div>

      <form action={updatePlatformSettingsAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberField label="Minimum uniqueness score (0-1)" name="uniquenessMinScore" defaultValue={settings.uniquenessMinScore} step="0.05" />
          <NumberField label="Max repeated section % (0-1)" name="maxRepeatedSectionPct" defaultValue={settings.maxRepeatedSectionPct} step="0.05" />
          <NumberField label="Batch size" name="batchSize" defaultValue={settings.batchSize} />
          <NumberField label="Max concurrency" name="maxConcurrency" defaultValue={settings.maxConcurrency} />
          <NumberField label="Daily generation limit" name="dailyGenerationLimit" defaultValue={settings.dailyGenerationLimit} />
          <NumberField label="Max GSC retries" name="maxGscRetries" defaultValue={settings.maxGscRetries} />
        </div>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="Auto-publish after validation passes" name="autoPublish" defaultChecked={settings.autoPublish} />
          <Checkbox label="Require affiliate mapping to publish" name="requireAffiliateMapping" defaultChecked={settings.requireAffiliateMapping} />
          <Checkbox label="Enable affiliate network fallback (not yet implemented)" name="networkFallbackEnabled" defaultChecked={settings.networkFallbackEnabled} />
          <Checkbox label="Hard-gate publish on GSC availability" name="gscHardGate" defaultChecked={settings.gscHardGate} />
        </div>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Save
        </button>
      </form>
    </div>
  );
}

function NumberField({ label, name, defaultValue, step }: { label: string; name: string; defaultValue: number; step?: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-neutral-300 px-2 py-2 text-sm"
      />
    </div>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}
