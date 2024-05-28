import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { chromeStorage } from '@/utils/chrome-store';

type PopupSettingsState = {
  queryBoxSelectors: {
    focus: boolean;
    languageModel: boolean;
    imageGenModel: boolean;
    collection: boolean;
  };
  qolTweaks: {
    threadTOC: boolean;
  };
};

const usePopupSettingsStore = create<PopupSettingsState>()(
  immer((set) => ({
    queryBoxSelectors: {
      focus: false,
      languageModel: false,
      imageGenModel: false,
      collection: false,
    },
    qolTweaks: {
      threadTOC: false,
    },
  }))
);

const popupSettingsStore = usePopupSettingsStore;

(async function initPopupSettingsStore() {
  const settings = await chromeStorage.getStorageValue('popupSettings');

  if (!settings) {
    await chromeStorage.setStorageValue({
      key: 'popupSettings',
      value: {
        queryBoxSelectors: {
          focus: false,
          languageModel: false,
          imageGenModel: false,
          collection: false,
        },
        qolTweaks: {
          threadTOC: false,
        },
      },
    });
  }

  const queryBoxSelectors = settings.queryBoxSelectors;
  const qolTweaks = settings.qolTweaks;

  if (queryBoxSelectors) {
    popupSettingsStore.setState((state) => {
      state.queryBoxSelectors = queryBoxSelectors;
    });
  }

  if (qolTweaks) {
    popupSettingsStore.setState((state) => {
      state.qolTweaks = qolTweaks;
    });
  }

  popupSettingsStore.subscribe((state) => {
    chromeStorage.setStorageValue({ key: 'popupSettings', value: state });
  });
})();

export { popupSettingsStore, usePopupSettingsStore };
