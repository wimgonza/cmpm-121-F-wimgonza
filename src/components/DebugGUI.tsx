import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import GUI from 'lil-gui';
import type { RoomType, SaveSlot } from '../types';
import { useGameStore } from '../hooks/useGameStore';
import { PLAYER_CONFIG, PHYSICS_CONFIG } from '../config/rooms';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

// ============================================================================
// DEBUG GUI COMPONENT
// ============================================================================
export function DebugGUI() {
  
  // HOOKS & STATE
  const guiRef = useRef<GUI | null>(null);
  const themeStateRef = useRef<{ darkMode: boolean } | null>(null);
  const saveSlotsRef = useRef<SaveSlot[]>([]);
  const saveListFolderRef = useRef<GUI | null>(null);
  const { camera } = useThree();
  const { 
    currentRoom, 
    setCurrentRoom, 
    money, 
    setMoney,
    saveGame,
    loadGame,
    deleteSave,
    listSaves,
    clearAllSaves,
    autoSaveEnabled,
    toggleAutoSave,
    autoSaveInterval,
    setAutoSaveInterval,
    currentSaveId,
    playerTeleportTarget,
  } = useGameStore();
  
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useI18n();

  // GUI INITIALIZATION & SETUP
  useEffect(() => {
    if (guiRef.current) return;

    const gui = new GUI();
    guiRef.current = gui;

    (gui as GUI & { title?: (title: string) => void }).title?.(t('ui.debugPanel.title'));

    // Apply RTL styling 
    if (isRTL) {
      const guiElement = gui.domElement as HTMLElement;
      guiElement.style.direction = 'rtl';
      guiElement.style.textAlign = 'right';
    }

    // PLAYER SETTINGS FOLDER
    const playerFolder = gui.addFolder(t('ui.debugPanel.player.title')); 
    playerFolder.add(PLAYER_CONFIG, 'moveSpeed', 5, 30, 1)
      .name(t('ui.debugPanel.player.moveSpeed'));
    playerFolder.add(PLAYER_CONFIG, 'jumpForce', 1, 15, 0.5)
      .name(t('ui.debugPanel.player.jumpForce'));
    playerFolder.add(PLAYER_CONFIG, 'sprintMultiplier', 1, 3, 0.1)
      .name(t('ui.debugPanel.player.sprintMultiplier'));
    playerFolder.add(PLAYER_CONFIG, 'mouseSensitivity', 0.1, 2, 0.05)
      .name(t('ui.debugPanel.player.mouseSensitivity'));
    playerFolder.close();

    // ========================================================================
    // INVENTORY & MONEY FOLDER
    // ========================================================================
    const inventoryFolder = gui.addFolder(t('ui.debugPanel.inventory.title'));
    
    // Money state object for GUI
    const inventoryState = { money: money };
    
    // Money slider with live updates
    inventoryFolder.add(inventoryState, 'money', 0, 10000, 1)
      .name(t('ui.debugPanel.inventory.money'))
      .listen()
      .onChange((value: number) => {
        setMoney(value);
      });
    
    // Quick money actions
    const quickMoneyActions = {
      add100: () => {
        const newMoney = useGameStore.getState().money + 100;
        setMoney(newMoney);
        inventoryState.money = newMoney;
      },
      add1000: () => {
        const newMoney = useGameStore.getState().money + 1000;
        setMoney(newMoney);
        inventoryState.money = newMoney;
      },
      reset: () => {
        setMoney(100);
        inventoryState.money = 100;
      },
    };
    
    // Add action buttons
    inventoryFolder.add(quickMoneyActions, 'add100').name(t('ui.debugPanel.inventory.add100'));
    inventoryFolder.add(quickMoneyActions, 'add1000').name(t('ui.debugPanel.inventory.add1000'));
    inventoryFolder.add(quickMoneyActions, 'reset').name(t('ui.debugPanel.inventory.reset'));
    
    // Live money updates from store
    const updateMoney = () => {
      inventoryState.money = useGameStore.getState().money;
      requestAnimationFrame(updateMoney);
    };
    updateMoney();
    
    inventoryFolder.open();

    // ========================================================================
    // PHYSICS SETTINGS FOLDER
    // ========================================================================
    const physicsFolder = gui.addFolder(t('ui.debugPanel.physics.title'));
    physicsFolder.add(PHYSICS_CONFIG, 'gravity', -50, 0, 1)
      .name(t('ui.debugPanel.physics.gravity'));
    physicsFolder.add(PHYSICS_CONFIG, 'groundFriction', 0, 1, 0.1)
      .name(t('ui.debugPanel.physics.groundFriction'));
    physicsFolder.close();

    // ========================================================================
    // CAMERA POSITION MONITOR FOLDER
    // ========================================================================
    const cameraFolder = gui.addFolder(t('ui.debugPanel.camera.title'));
    const cameraPos = { x: 0, y: 0, z: 0 };
    
    // Read-only position displays
    cameraFolder.add(cameraPos, 'x').name('X').listen().disable();
    cameraFolder.add(cameraPos, 'y').name('Y').listen().disable();
    cameraFolder.add(cameraPos, 'z').name('Z').listen().disable();
    
    // Live camera position updates
    const updateCamera = () => {
      cameraPos.x = Math.round(camera.position.x * 100) / 100;
      cameraPos.y = Math.round(camera.position.y * 100) / 100;
      cameraPos.z = Math.round(camera.position.z * 100) / 100;
      requestAnimationFrame(updateCamera);
    };
    updateCamera();
    
    cameraFolder.close();

    // ========================================================================
    // ROOM NAVIGATION FOLDER
    // ========================================================================
    const roomFolder = gui.addFolder(t('ui.debugPanel.rooms.title'));
    const roomOptions: { room: RoomType } = {
      room: currentRoom,
    };
    
    // Room selector dropdown using existing room names from your JSON
    roomFolder.add(roomOptions, 'room', ['main', 'minigame1', 'minigame2', 'minigame3', 'minigame4'])
      .name(t('ui.debugPanel.rooms.currentRoom'))
      .onChange((value: RoomType) => {
        setCurrentRoom(value);
      });
    
    roomFolder.close();

    // ========================================================================
    // THEME SETTINGS FOLDER
    // ========================================================================
    const themeFolder = gui.addFolder(t('ui.debugPanel.theme.title'));
    const themeState = { darkMode: isDarkMode };
    themeStateRef.current = themeState;
    
    // Theme toggle switch
    themeFolder.add(themeState, 'darkMode')
      .name(t('ui.debugPanel.theme.darkMode'))
      .listen()
      .onChange((value: boolean) => {
        if (value !== isDarkMode) {
          toggleTheme();
        }
      });
    
    themeFolder.close();

    // ========================================================================
    // LANGUAGE SETTINGS FOLDER
    // ========================================================================
    const languageFolder = gui.addFolder(t('ui.debugPanel.language.title'));
    const languageState = { language: language };
    
    // Language selector dropdown
    languageFolder.add(languageState, 'language', ['en', 'zh', 'ar'])
      .name(t('ui.debugPanel.language.select'))
      .listen()
      .onChange(async (value: 'en' | 'zh' | 'ar') => {
        if (value !== language) {
          await setLanguage(value);
        }
      });
    
    languageFolder.close();

    // ========================================================================
    // SAVE SYSTEM FOLDER
    // ========================================================================
    const saveFolder = gui.addFolder(t('ui.debugPanel.saveSystem.title'));
    
    // Auto-save settings
    const saveSettings = {
      autoSave: autoSaveEnabled,
      autoSaveInterval: autoSaveInterval,
      currentSave: currentSaveId || t('ui.debugPanel.saveSystem.none'),
      playerPosition: playerTeleportTarget 
        ? `${playerTeleportTarget.x.toFixed(1)}, ${playerTeleportTarget.y.toFixed(1)}, ${playerTeleportTarget.z.toFixed(1)}`
        : t('ui.debugPanel.saveSystem.noPosition'),
    };
    
    // Auto-save toggle
    saveFolder.add(saveSettings, 'autoSave')
      .name(t('ui.debugPanel.saveSystem.autoSave'))
      .listen()
      .onChange((value: boolean) => {
        if (value !== autoSaveEnabled) {
          toggleAutoSave();
        }
      });
    
    // Auto-save interval slider
    saveFolder.add(saveSettings, 'autoSaveInterval', 30, 3600, 30)
      .name(t('ui.debugPanel.saveSystem.autoSaveInterval'))
      .listen()
      .onChange((value: number) => {
        setAutoSaveInterval(value);
      });
    
    // Current save display (read-only)
    saveFolder.add(saveSettings, 'currentSave')
      .name(t('ui.debugPanel.saveSystem.currentSave'))
      .listen()
      .disable();
    
    // Player position display (read-only)
    saveFolder.add(saveSettings, 'playerPosition')
      .name(t('ui.debugPanel.saveSystem.playerPosition'))
      .listen()
      .disable();
    
    // Quick save/load buttons
    const saveActions = {
      quickSave: () => {
        const position = playerTeleportTarget || { 
          x: camera.position.x, 
          y: 1.8, 
          z: camera.position.z 
        };
        
        const saveId = saveGame(position, 'quick');
        if (saveId) {
          saveSettings.currentSave = saveId;
          refreshSaveList();
          console.log(t('ui.debugPanel.saveSystem.quickSaveSuccess'));
        }
      },
      quickLoad: () => {
        // Get last quick save ID from localStorage
        const lastQuickSaveId = localStorage.getItem('mini3d_last_quicksave');
        if (lastQuickSaveId) {
          if (loadGame(lastQuickSaveId)) {
            saveSettings.currentSave = currentSaveId || t('ui.debugPanel.saveSystem.loaded');
            console.log(t('ui.debugPanel.saveSystem.quickLoadSuccess'));
          }
        } else {
          console.log(t('ui.debugPanel.saveSystem.noQuickSave'));
        }
      },
      manualSave: () => {
        const position = playerTeleportTarget || { 
          x: camera.position.x, 
          y: 1.8, 
          z: camera.position.z 
        };
        const saveName = prompt(t('ui.debugPanel.saveSystem.savePrompt')) || undefined;
        const saveId = saveGame(position, 'manual', saveName);
        if (saveId) {
          saveSettings.currentSave = saveId;
          refreshSaveList();
        }
      },
      refreshSaves: () => {
        refreshSaveList();
      },
      clearAll: () => {
        if (confirm(t('ui.debugPanel.saveSystem.clearConfirm'))) {
          clearAllSaves();
          saveSettings.currentSave = t('ui.debugPanel.saveSystem.none');
          refreshSaveList();
          console.log(t('ui.debugPanel.saveSystem.allCleared'));
        }
      },
    };
    
    saveFolder.add(saveActions, 'quickSave')
      .name(t('ui.debugPanel.saveSystem.quickSave'));
    saveFolder.add(saveActions, 'quickLoad')
      .name(t('ui.debugPanel.saveSystem.quickLoad'));
    saveFolder.add(saveActions, 'manualSave')
      .name(t('ui.debugPanel.saveSystem.manualSave'));
    saveFolder.add(saveActions, 'refreshSaves')
      .name(t('ui.debugPanel.saveSystem.refreshList'));
    saveFolder.add(saveActions, 'clearAll')
      .name(t('ui.debugPanel.saveSystem.clearAll'));
    
    // Create initial save list folder
    createSaveListFolder();
    
    // Function to create fresh save list folder
    function createSaveListFolder() {
      // Remove existing save list folder if it exists
      if (saveListFolderRef.current) {
        saveListFolderRef.current.hide();
        const parent = saveListFolderRef.current.parent;
        
        // Type-safe parent handling
        if (parent && (parent as GUI & { folders?: GUI[] }).folders) {
          const parentWithFolders = parent as GUI & { folders: GUI[] };
          const index = parentWithFolders.folders.indexOf(saveListFolderRef.current);
          if (index > -1) {
            parentWithFolders.folders.splice(index, 1);
          }
        }
      }
      
      // Create new save list folder
      saveListFolderRef.current = saveFolder.addFolder(t('ui.debugPanel.saveSystem.saveSlots'));
      saveListFolderRef.current.open();
      
      // Populate with current saves
      const slots = listSaves();
      saveSlotsRef.current = slots;
      
      if (slots.length === 0) {
        // Create a simple message if no saves
        const messageObj = { message: t('ui.debugPanel.saveSystem.noSaves') };
        saveListFolderRef.current.add(messageObj, 'message').disable();
      } else {
        slots.forEach((slot, index) => {
          // Create a sub-folder for each save slot
          const slotFolder = saveListFolderRef.current!.addFolder(
            `${t('ui.debugPanel.saveSystem.save')} ${index + 1}: ${slot.name}`
          );
          
          const slotObj = {
            name: slot.name,
            timestamp: new Date(slot.timestamp).toLocaleString(),
            load: () => {
              if (loadGame(slot.id)) {
                saveSettings.currentSave = slot.id;
                console.log(t('ui.debugPanel.saveSystem.loadedSave', { name: slot.name }));
              }
            },
            delete: () => {
              if (confirm(t('ui.debugPanel.saveSystem.deleteConfirm', { name: slot.name }))) {
                deleteSave(slot.id);
                // Recreate the save list
                setTimeout(() => {
                  createSaveListFolder();
                }, 100);
              }
            }
          };
          
          slotFolder.add(slotObj, 'name').disable();
          slotFolder.add(slotObj, 'timestamp').disable();
          slotFolder.add(slotObj, 'load').name(t('ui.debugPanel.saveSystem.loadThisSave'));
          slotFolder.add(slotObj, 'delete').name(t('ui.debugPanel.saveSystem.deleteThisSave'));
          slotFolder.close();
        });
      }
    }
    
    // Function to refresh save list
    function refreshSaveList() {
      const slots = listSaves();
      
      // Only recreate if saves have actually changed
      if (JSON.stringify(slots) !== JSON.stringify(saveSlotsRef.current)) {
        saveSlotsRef.current = slots;
        createSaveListFolder();
      }
      
      // Update current save display
      saveSettings.currentSave = currentSaveId || t('ui.debugPanel.saveSystem.none');
      
      // Update player position display
      const storeState = useGameStore.getState();
      if (storeState.playerTeleportTarget) {
        const pos = storeState.playerTeleportTarget;
        saveSettings.playerPosition = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
      }
      
      // Update auto-save settings
      saveSettings.autoSave = autoSaveEnabled;
      saveSettings.autoSaveInterval = autoSaveInterval;
    }
    
    // Set up periodic refresh
    let frameCount = 0;
    const autoRefresh = () => {
      frameCount++;
      
      if (frameCount % 120 === 0) { // Check every 2 seconds at 60fps
        refreshSaveList();
      }
      
      requestAnimationFrame(autoRefresh);
    };
    autoRefresh();
    
    saveFolder.open();

    // ========================================================================
    // CLEANUP FUNCTION
    // ========================================================================
    return () => {
      if (guiRef.current) {
        guiRef.current.destroy();
      }
      guiRef.current = null;
      themeStateRef.current = null;
      saveListFolderRef.current = null;
    };
  }, [
    camera, currentRoom, setCurrentRoom, money, setMoney, toggleTheme, 
    isDarkMode, autoSaveEnabled, autoSaveInterval, clearAllSaves, 
    currentSaveId, deleteSave, listSaves, loadGame, playerTeleportTarget, 
    saveGame, setAutoSaveInterval, toggleAutoSave, language, setLanguage, 
    t, isRTL
  ]);

  // Update theme state in GUI when theme changes
  useEffect(() => {
    if (themeStateRef.current) {
      themeStateRef.current.darkMode = isDarkMode;
    }
  }, [isDarkMode]);

  // Update GUI title when language changes
  useEffect(() => {
    if (guiRef.current) {
      (guiRef.current as GUI & { title?: (title: string) => void }).title?.(t('ui.debugPanel.title'));
    }
  }, [language, t]);

  // RENDER
  return null; 
}