# 浏览器绘画扩展 - Mermaid架构图

## 整体系统架构

```mermaid
graph TB
    subgraph "Chrome Extension"
        subgraph "Background Script"
            BI[Extension Icon]
            BH[Message Handler]
            BS[Script Injection]
        end

        subgraph "Content Script"
            CC[ContentController]
            DM[DrawingManager]
            TM[ToolbarManager]
            MH[MessageHandler]
        end

        subgraph "Drawing Engine"
            DE[DrawingEngine]
            DS[DrawingState]
            TLM[ToolManager]
            DR[DrawingRenderer]
            TE[TextEditingState]
            EH[DrawingEventHandler]
        end

        subgraph "Tool Plugins"
            PT[PenTool]
            RT[RectangleTool]
            CT[CircleTool]
            TT[TextTool]
            AT[ArrowTool]
            LT[LineTool]
            HT[HandDrawnTool]
            ET[EraserTool]
            HLT[HighlighterTool]
            ST[StarTool]
            TRT[TriangleTool]
            SET[SelectTool]
        end

        subgraph "UI Layer"
            TR[ToolbarRenderer]
            TEV[ToolbarEvents]
            SM[SettingsManager]
            PP[PropertyPanel]
        end
    end

    subgraph "Web Page"
        CO[Canvas Overlay]
        WP[Target Page]
    end

    BI --> BH
    BH --> BS
    BS --> CC
    CC --> DM
    CC --> TM
    CC --> MH

    DM --> DE
    DE --> DS
    DE --> TLM
    DE --> DR
    DE --> TE
    DE --> EH

    TLM --> PT
    TLM --> RT
    TLM --> CT
    TLM --> TT
    TLM --> AT
    TLM --> LT
    TLM --> HT
    TLM --> ET
    TLM --> HLT
    TLM --> ST
    TLM --> TRT
    TLM --> SET

    TM --> TR
    TM --> TEV
    TM --> SM
    TM --> PP

    DE --> CO
    CO --> WP
```

## 数据流向图

```mermaid
flowchart LR
    subgraph "User Interaction"
        UI[User Input]
    end

    subgraph "UI Layer"
        TB[Toolbar]
        PP[Property Panel]
    end

    subgraph "Control Layer"
        CC[ContentController]
        DM[DrawingManager]
        TM[ToolbarManager]
    end

    subgraph "Engine Layer"
        DE[DrawingEngine]
        TLM[ToolManager]
        DS[DrawingState]
    end

    subgraph "Plugin Layer"
        TP[Tool Plugin]
    end

    subgraph "Rendering Layer"
        DR[DrawingRenderer]
        CO[Canvas Overlay]
    end

    UI --> TB
    UI --> PP
    TB --> CC
    PP --> CC
    CC --> DM
    CC --> TM
    DM --> DE
    DE --> TLM
    TLM --> TP
    TP --> DS
    DS --> DR
    DR --> CO
```

## 组件关系图

```mermaid
classDiagram
    class ContentController {
        -drawingManager: DrawingManager
        -toolbarManager: ToolbarManager
        -messageHandler: MessageHandler
        +activate()
        +deactivate()
        +toggle()
        +getStatus()
    }

    class DrawingManager {
        -drawingEngine: DrawingEngine
        -canvas: HTMLCanvasElement
        -isActive: boolean
        +activate()
        +deactivate()
        +setMode()
        +setOptions()
    }

    class DrawingEngine {
        -canvas: HTMLCanvasElement
        -drawingState: DrawingState
        -toolManager: ToolManager
        -renderer: DrawingRenderer
        -eventHandler: DrawingEventHandler
        +setMode()
        +setOptions()
        +redrawCanvas()
    }

    class ToolManager {
        -tools: Map<string, ToolPlugin>
        -currentTool: ToolPlugin
        +registerTool()
        +setCurrentTool()
        +getCurrentTool()
    }

    class ToolPlugin {
        <<abstract>>
        +name: string
        +type: DrawingMode
        +icon: string
        +title: string
        +startDrawing()
        +continueDrawing()
        +finishDrawing()
        +render()
        +hitTest()
    }

    class DrawingState {
        -objects: DrawingObject[]
        -selectedObject: DrawingObject
        -options: DrawingOptions
        +addObject()
        +removeObject()
        +setSelectedObject()
        +undo()
        +redo()
    }

    class DrawingRenderer {
        -ctx: CanvasRenderingContext2D
        -toolManager: ToolManager
        +renderObjects()
        +renderObject()
        +renderSelectionBox()
    }

    class ToolbarManager {
        -toolbar: HTMLElement
        -drawingManager: DrawingManager
        -renderer: ToolbarRenderer
        -events: ToolbarEvents
        +create()
        +destroy()
        +setMode()
    }

    ContentController --> DrawingManager
    ContentController --> ToolbarManager
    DrawingManager --> DrawingEngine
    DrawingEngine --> ToolManager
    DrawingEngine --> DrawingState
    DrawingEngine --> DrawingRenderer
    ToolManager --> ToolPlugin
    ToolbarManager --> DrawingManager
```

## 工作流程时序图

```mermaid
sequenceDiagram
    participant User
    participant Background as Background Script
    participant Content as Content Script
    participant Drawing as DrawingManager
    participant Toolbar as ToolbarManager
    participant Engine as DrawingEngine
    participant Canvas as Canvas Overlay

    User->>Background: Click Extension Icon
    Background->>Content: Send Toggle Message
    Content->>Drawing: Activate Drawing Mode
    Drawing->>Canvas: Create Canvas Overlay
    Drawing->>Engine: Initialize Drawing Engine
    Content->>Toolbar: Create Toolbar
    Toolbar->>Canvas: Position Toolbar

    Note over Canvas: Drawing Mode Ready

    User->>Toolbar: Select Tool
    Toolbar->>Engine: Set Drawing Mode
    Engine->>Canvas: Update Cursor

    User->>Canvas: Start Drawing
    Canvas->>Engine: Mouse Down Event
    Engine->>Engine: Create Drawing Object

    User->>Canvas: Move Mouse
    Canvas->>Engine: Mouse Move Event
    Engine->>Engine: Update Drawing Object
    Engine->>Canvas: Redraw Canvas

    User->>Canvas: End Drawing
    Canvas->>Engine: Mouse Up Event
    Engine->>Engine: Finalize Drawing Object
    Engine->>Canvas: Final Redraw
```

## 插件系统架构

```mermaid
graph TB
    subgraph "Plugin System"
        subgraph "ToolManager"
            TM[ToolManager]
            CT[Current Tool]
        end

        subgraph "Tool Plugins"
            subgraph "Basic Tools"
                PT[PenTool]
                RT[RectangleTool]
                CT2[CircleTool]
                TT[TextTool]
            end

            subgraph "Advanced Tools"
                AT[ArrowTool]
                LT[LineTool]
                HT[HandDrawnTool]
                ET[EraserTool]
            end

            subgraph "Special Tools"
                HLT[HighlighterTool]
                ST[StarTool]
                TRT[TriangleTool]
                SET[SelectTool]
            end
        end

        subgraph "Tool Interface"
            TPI[ToolPlugin Interface]
            TPIM[ToolPlugin Methods]
        end
    end

    TM --> CT
    TM --> PT
    TM --> RT
    TM --> CT2
    TM --> TT
    TM --> AT
    TM --> LT
    TM --> HT
    TM --> ET
    TM --> HLT
    TM --> ST
    TM --> TRT
    TM --> SET

    PT -.-> TPI
    RT -.-> TPI
    CT2 -.-> TPI
    TT -.-> TPI
    AT -.-> TPI
    LT -.-> TPI
    HT -.-> TPI
    ET -.-> TPI
    HLT -.-> TPI
    ST -.-> TPI
    TRT -.-> TPI
    SET -.-> TPI

    TPI --> TPIM
```

## 状态管理架构

```mermaid
stateDiagram-v2
    [*] --> ExtensionInactive

    ExtensionInactive --> ExtensionActive : User clicks extension icon
    ExtensionActive --> DrawingInactive : Content script loads

    DrawingInactive --> DrawingActive : User activates drawing mode
    DrawingActive --> ToolSelected : User selects a tool

    ToolSelected --> DrawingInProgress : User starts drawing
    DrawingInProgress --> DrawingActive : User finishes drawing

    DrawingActive --> DrawingInactive : User deactivates drawing mode
    DrawingInactive --> ExtensionInactive : User deactivates extension

    state DrawingInProgress {
        [*] --> MouseDown
        MouseDown --> MouseMove : Mouse moves
        MouseMove --> MouseMove : Continue drawing
        MouseMove --> MouseUp : Mouse released
        MouseUp --> [*]
    }

    state ToolSelected {
        [*] --> PenTool
        [*] --> RectangleTool
        [*] --> CircleTool
        [*] --> TextTool
        [*] --> ArrowTool
        [*] --> LineTool
        [*] --> HandDrawnTool
        [*] --> EraserTool
        [*] --> HighlighterTool
        [*] --> StarTool
        [*] --> TriangleTool
        [*] --> SelectTool
    }
```

## 文件结构树

```mermaid
graph TD
    A[src/] --> B[background.ts]
    A --> C[content/]
    A --> D[lib/]

    C --> E[content.ts]
    C --> F[ContentController.ts]
    C --> G[core/]
    C --> H[ui/]

    G --> I[DrawingManager.ts]
    G --> J[MessageHandler.ts]

    H --> K[ToolbarManager.ts]
    H --> L[ToolbarRenderer.ts]
    H --> M[ToolbarEvents.ts]
    H --> N[SettingsManager.ts]

    D --> O[core/]
    D --> P[plugins/]
    D --> Q[state/]
    D --> R[events/]
    D --> S[rendering/]

    O --> T[DrawingEngine.ts]
    O --> U[types.ts]

    P --> V[ToolManager.ts]
    P --> W[ToolPlugin.ts]
    P --> X[PenTool.ts]
    P --> Y[RectangleTool.ts]
    P --> Z[CircleTool.ts]
    P --> AA[TextTool.ts]
    P --> BB[ArrowTool.ts]
    P --> CC[LineTool.ts]
    P --> DD[HandDrawnTool.ts]
    P --> EE[EraserTool.ts]
    P --> FF[HighlighterTool.ts]
    P --> GG[StarTool.ts]
    P --> HH[TriangleTool.ts]
    P --> II[SelectTool.ts]

    Q --> JJ[DrawingState.ts]
    Q --> KK[TextEditingState.ts]

    R --> LL[DrawingEventHandler.ts]

    S --> MM[DrawingRenderer.ts]
```

## 技术栈层次

```mermaid
graph TB
    subgraph "Application Layer"
        AL[Browser Extension]
    end

    subgraph "Framework Layer"
        FL[TypeScript]
        FL2[Vite]
        FL3[Chrome Extension API]
    end

    subgraph "Core APIs"
        CA[Canvas API]
        CA2[DOM API]
        CA3[Manifest V3]
    end

    subgraph "Design Patterns"
        DP[Plugin Pattern]
        DP2[Observer Pattern]
        DP3[State Management]
        DP4[Factory Pattern]
        DP5[Strategy Pattern]
    end

    subgraph "Performance"
        PF[Canvas Optimization]
        PF2[Event Delegation]
        PF3[Memory Management]
        PF4[RequestAnimationFrame]
    end

    AL --> FL
    AL --> FL2
    AL --> FL3

    FL --> CA
    FL --> CA2
    FL --> CA3

    CA --> DP
    CA --> DP2
    CA --> DP3
    CA --> DP4
    CA --> DP5

    DP --> PF
    DP2 --> PF2
    DP3 --> PF3
    DP4 --> PF4
```

这些Mermaid图表清晰地展示了浏览器绘画扩展的完整架构，包括：

1. **整体系统架构** - 展示了各层之间的关系
2. **数据流向图** - 显示了数据如何在组件间流动
3. **组件关系图** - 展示了类之间的依赖关系
4. **工作流程时序图** - 详细描述了用户交互的完整流程
5. **插件系统架构** - 展示了工具插件的组织结构
6. **状态管理架构** - 显示了系统的状态转换
7. **文件结构树** - 展示了项目的文件组织
8. **技术栈层次** - 展示了技术选型和设计模式

这个架构设计体现了现代Web扩展开发的最佳实践，具有高度的模块化、可扩展性和可维护性。
