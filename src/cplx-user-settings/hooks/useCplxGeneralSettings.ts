import { produce } from "immer";

import useCplxUserSettings from "@/cplx-user-settings/hooks/useCplxUserSettings";
import { CplxUserSettings } from "@/cplx-user-settings/types/cplx-user-settings.types";

export default function useCplxGeneralSettings() {
  const {
    data: { data: settings },
    mutation: { mutateAsync: updateSettings },
  } = useCplxUserSettings();

  const generalSettings = settings?.generalSettings;

  const handleSettingsChange = async <
    T extends keyof CplxUserSettings["generalSettings"],
  >(
    section: T,
    updater: (draft: CplxUserSettings["generalSettings"][T]) => void,
  ) => {
    if (!generalSettings) return;

    return await updateSettings((draft) => {
      draft.generalSettings[section] = produce(
        draft.generalSettings[section],
        updater,
      );
    });
  };

  return {
    settings: generalSettings,
    updateSettings: handleSettingsChange,
  };
}
