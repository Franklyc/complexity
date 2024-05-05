class QueryBox {
  static async fetchSettings() {
    const url = 'https://www.perplexity.ai/p/api/v1/user/settings';

    const response = await fetch(url);

    if (!response.ok) throw new Error('Failed to fetch settings');

    const data = await response.json();

    return data;
  }

  static async experimental_fetchCollections() {
    const url = `https://www.perplexity.ai/_next/data/${window.BUILD_ID}/en-US/library.json`;
    let jsonData = await fetch(url);

    if (!jsonData.ok) throw new Error('Failed to fetch collections');

    jsonData = await jsonData.text();

    const fetchedCollections =
      JSON.parse(jsonData).pageProps.dehydratedState.queries[1].state.data
        .pages[0];

    if (!fetchedCollections?.length) return [];

    const collections = [];

    fetchedCollections.forEach((collection) => {
      collections.push({
        title: collection.title,
        uuid: collection.uuid,
        instructions: collection.instructions,
      });
    });

    return collections;
  }

  static createSelectors() {
    const $buttonBar = initializeButtonBar();

    if (!$buttonBar) return;

    const initializeCollections = async () => {
      const data = await this.experimental_fetchCollections();

      const collections = [
        { title: 'Default', uuid: undefined },
        ...data,
      ];

      return collections;
    };

    const initializeDefaultModels = async () => {
      const data = await this.fetchSettings();

      const chatModelCode = data?.['default_model'];
      const imageModelCode = data?.['default_image_generation_model'];

      unsafeWindow.WSHOOK_INSTANCE.persistentSettings.chatModelCode = chatModelCode;
      unsafeWindow.WSHOOK_INSTANCE.persistentSettings.imageModelCode =
        imageModelCode;

      return {
        chatModelCode,
        imageModelCode,
      };
    };

    const getDefaultChatModelName = () => {
      return (
        getPredefinedChatModels().find(
          (m) =>
            m.code === unsafeWindow.WSHOOK_INSTANCE.persistentSettings.chatModelCode
        )?.name || ''
      );
    };

    const getDefaultImageModelName = () => {
      return (
        getPredefinedImageModels().find(
          (m) =>
            m.code ===
            unsafeWindow.WSHOOK_INSTANCE.persistentSettings.imageModelCode
        )?.name || ''
      );
    };

    const getDefaultCollectionTitle = () => {
      return (
        unsafeWindow.WSHOOK_INSTANCE.persistentSettings.collection?.title ||
        'Default'
      );
    };

    function populateDefaults() {
      chatModelSelector.setText(getDefaultChatModelName());
      imageModelSelector.setText(getDefaultImageModelName());
      collectionSelector.setText(getDefaultCollectionTitle());
    }

    const chatModelSelector = UI.createDropdown({
      selectorClass: 'model-selector',
      svgIcon: 'cpu',
    });
    const imageModelSelector = UI.createDropdown({
      selectorClass: 'image-model-selector',
      svgIcon: 'image',
    });
    const collectionSelector = UI.createDropdown({
      selectorClass: 'collection-selector',
      svgIcon: 'grid-round-2',
    });

    populateDefaults();

    initializeDefaultModels().then(() => {
      const chatModels = getPredefinedChatModels();
      const imageModels = getPredefinedImageModels();

      populateDefaults();

      setupModelSelector(chatModelSelector, chatModels, false);
      setupModelSelector(imageModelSelector, imageModels, true);
    });

    initializeCollections().then((collections) => {
      setupCollectionSelector(collectionSelector, collections);
    });

    arrangeUI(
      $buttonBar,
      chatModelSelector,
      collectionSelector,
      imageModelSelector
    );

    function initializeButtonBar() {
      const $attachButton = $('div:contains("Attach")');

      let $buttonBar = $attachButton.closest(
        '.flex.bg-background.dark\\:bg-offsetDark.rounded-l-lg.col-start-1.row-start-2.-ml-2'
      );
      if (!$buttonBar.length || $buttonBar.children().length > 2) return null;

      $buttonBar
        .children('div:contains("Attach")')
        .find('> button > div')
        .removeClass('gap-xs');

      $buttonBar
        .children('div:contains("Attach")')
        .find('> button > div > div')
        .addClass('hidden');

      return $buttonBar.length > 1 ? $buttonBar.last() : $buttonBar;
    }

    function getPredefinedChatModels() {
      return [
        { name: 'GPT-4', code: 'gpt4' },
        { name: 'Claude Opus', code: 'claude3opus' },
        { name: 'Claude Sonnet', code: 'claude2' },
        { name: 'Default', code: 'turbo' },
        { name: 'Sonar Large 32K', code: 'experimental' },
        { name: 'Mistral Large', code: 'mistral' },
      ];
    }

    function getPredefinedImageModels() {
      return [
        { name: 'DALL-E 3', code: 'dall-e-3' },
        { name: 'Playground', code: 'default' },
        { name: 'SDXL', code: 'sdxl' },
      ];
    }

    function setupModelSelector(selector, models, isImageModel) {
      selector.$element.click(async () => {
        const { $popover, addSelection } = UI.createSelectionPopover(
          selector.$element[0],
          isImageModel ? 'image-model-selector' : 'model-selector'
        );

        if (!$popover) return;

        $('main').append($popover);

        const closePopover = () => closeAndRemovePopover($popover);

        models.forEach((model) => {
          addSelection({
            name: model.name,
            onClick: async () => {
              const oldModelName = selector.getText();
              selector.setText(model.name);

              try {
                setModel(model.code, isImageModel);

                if (isImageModel) {
                  unsafeWindow.WSHOOK_INSTANCE.persistentSettings.imageModelCode =
                    model.code;
                } else {
                  unsafeWindow.WSHOOK_INSTANCE.persistentSettings.chatModelCode =
                    model.code;
                }

                initializeDefaultModels();
              } catch (error) {
                console.error('Failed to switch model', error);
                alert('Failed to switch model');
                selector.setText(oldModelName);
              } finally {
                closePopover();
              }
            },
          });
        });

        setTimeout(() => $(document).on('click', closePopover), 100);
      });
    }

    function setupCollectionSelector(selector, collections) {
      selector.$element.click(async () => {
        const { $popover, addSelection } = UI.createSelectionPopover(
          selector.$element[0],
          'collection-selector'
        );
        if (!$popover) return;

        $('main').append($popover);
        const closePopover = () => closeAndRemovePopover($popover);

        collections.forEach((collection) => {
          addSelection({
            name: collection.title,
            onClick: () => {
              unsafeWindow.WSHOOK_INSTANCE.persistentSettings.collection = {};
              unsafeWindow.WSHOOK_INSTANCE.persistentSettings.collection.uuid =
                collection.uuid;
              unsafeWindow.WSHOOK_INSTANCE.persistentSettings.collection.title =
                collection.title;
              Logger.log(
                'Selected collection:',
                collection.title,
                collection.uuid
              );
              $('.collection-selector-text').text(collection.title);
              closePopover();
            },
          });
        });

        setTimeout(() => $(document).on('click', closePopover), 100);
      });
    }

    function closeAndRemovePopover($popover) {
      $popover.remove();
      $(document).off('click', closeAndRemovePopover);
    }

    function arrangeUI(
      $buttonBar,
      chatModelSelector,
      collectionSelector,
      imageModelSelector
    ) {
      $buttonBar.children().first().after(imageModelSelector.$element);
      $buttonBar.children().first().after(chatModelSelector.$element);
      $buttonBar.children().first().after(collectionSelector.$element);
      $buttonBar.addClass('flex-wrap col-span-2');
    }

    async function setModel(model, isImageModel) {
      const settingsKey = isImageModel
        ? 'default_image_generation_model'
        : 'default_model';
      await unsafeWindow.WSHOOK_INSTANCE.sendMessage({
        messageCode: 423,
        event: 'save_user_settings',
        data: {
          [settingsKey]: model,
        },
      });
    }
  }
}
