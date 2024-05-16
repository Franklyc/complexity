class FocusSelector {
  static getFocusModes() {
    return [
      {
        name: 'Web browsing',
        dropdownTitle: 'Internet',
        code: 'internet',
        svgIcon: 'globe',
      },
      {
        name: 'Writing',
        code: 'writing',
        svgIcon: 'pencil',
      },
      {
        name: 'Academic',
        code: 'scholar',
        svgIcon: 'books',
      },
      {
        name: 'Wolfram|Alpha',
        code: 'wolfram',
        svgIcon: 'badge-percent',
      },
      {
        name: 'Youtube',
        code: 'youtube',
        svgIcon: 'youtube',
      },
      {
        name: 'Reddit',
        code: 'reddit',
        svgIcon: 'reddit',
      },
    ];
  }

  static getDefaultTitle() {
    const searchFocusCode = unsafeWindow.STORE.focus;

    const item = this.getFocusModes().find((m) => m.code === searchFocusCode);

    return {
      title: item?.dropdownTitle || item?.name || 'Focus',
      icon: item?.svgIcon,
      emoji: item?.emoji,
    };
  }

  static createDropdown() {
    return DropdownUI.create({
      selectorClass: 'focus-selector',
    });
  }

  static setupSelectorContextMenu(selector) {
    selector.$element.on('contextmenu', (e) => {
      e.preventDefault();

      const { $popover, addSelection } = DropdownUI.createSelectionPopover({
        sourceElement: null,
        sourceElementId: 'focus-selector-context-menu',
        isContextMenu: true,
      });

      if (!$popover) return;

      $('main').append($popover);

      const closePopover = () => UI.closeAndRemovePopover($popover);

      const isDefaultFocus =
        unsafeWindow.STORE.focus ===
        JSONUtils.safeParse(localStorage.getItem('defaultFocus'));

      addSelection({
        input: {
          name: !isDefaultFocus ? 'Set as default' : 'Clear default',
          onClick: () => {
            closePopover();

            if (!isDefaultFocus) {
              localStorage.setItem(
                'defaultFocus',
                JSON.stringify(unsafeWindow.STORE.focus)
              );
            } else {
              localStorage.removeItem('defaultFocus');
            }
          },
        },
      });

      UI.showPopover({
        $anchor: selector.$element,
        $popover,
      });

      setTimeout(() => $(document).on('click', closePopover), 100);
    });
  }

  static setupSelectionContextMenu($selection, selector) {
    $selection.on('contextmenu', (e) => {
      e.preventDefault();

      const { $popover, addSelection } = DropdownUI.createSelectionPopover({
        sourceElement: null,
        sourceElementId: 'focus-selector-context-menu',
        isContextMenu: true,
      });

      if (!$popover) return;

      $('main').append($popover);

      const closePopover = () => UI.closeAndRemovePopover($popover);

      const isDefaultFocus =
        $selection[0].params.code === unsafeWindow.STORE.focus;

      addSelection({
        input: {
          name: isDefaultFocus ? 'Clear default' : 'Set as default',
          onClick: () => {
            if (!isDefaultFocus) {
              localStorage.setItem(
                'defaultFocus',
                JSON.stringify($selection[0].params.code)
              );
            } else {
              localStorage.removeItem('defaultFocus');
            }

            unsafeWindow.STORE.focus = $selection[0].params.code;

            const defaultTitle = this.getDefaultTitle();

            $('.focus-selector').each((_, el) => {
              UI.setDropdownText({
                $dropdown: $(el).parent(),
                text: defaultTitle.title,
                icon: defaultTitle.icon,
              });
            });

            closePopover();
          },
        },
      });

      UI.showPopover({
        $anchor: $selection,
        $popover,
        placement: 'horizontal',
      });

      setTimeout(() => $(document).on('click', closePopover), 100);
    });
  }

  static setupSelector(selector, modes) {
    selector.$element.on('click', async () => {
      const { $popover, addSelection } = DropdownUI.createSelectionPopover({
        sourceElement: selector.$element[0],
        sourceElementId: 'focus-selector',
      });

      if (!$popover) return;

      $('main').append($popover);

      const closePopover = () => UI.closeAndRemovePopover($popover);

      const $selections = modes.map((mode) =>
        addSelection({
          input: {
            name: mode.name,
            onClick: async () => {
              unsafeWindow.STORE.focus = mode.code;

              const defaultTitle = this.getDefaultTitle();

              $('.focus-selector').each((_, el) => {
                UI.setDropdownText({
                  $dropdown: $(el).parent(),
                  text: defaultTitle.title,
                  icon: defaultTitle.icon,
                });
              });

              closePopover();
            },
          },
          isSelected: mode.code === unsafeWindow.STORE.focus,
          params: { code: mode.code },
        })
      );

      $selections.forEach(($selection) => {
        this.setupSelectionContextMenu($selection, selector);
      });

      UI.showPopover({
        $anchor: selector.$element,
        $popover,
      });

      setTimeout(() => $(document).on('click', closePopover), 100);
    });

    this.setupSelectorContextMenu(selector);
  }
}