use eframe::egui;

#[derive(Clone, Copy)]
pub enum ButtonKind {
    Primary,
    Secondary,
    Quiet,
    Danger,
}

#[derive(Clone, Copy)]
pub enum BadgeKind {
    Accent,
    Success,
    Warning,
    Danger,
    Neutral,
}

#[derive(Clone, Copy)]
pub struct Palette {
    pub surface: egui::Color32,
    pub raised: egui::Color32,
    pub stroke: egui::Color32,
    pub accent: egui::Color32,
    pub success: egui::Color32,
    pub warning: egui::Color32,
    pub danger: egui::Color32,
}

#[derive(Clone, Copy)]
struct ThemeColors {
    canvas: egui::Color32,
    panel: egui::Color32,
    surface: egui::Color32,
    raised: egui::Color32,
    stroke: egui::Color32,
    text: egui::Color32,
    muted: egui::Color32,
    faint: egui::Color32,
    accent: egui::Color32,
    success: egui::Color32,
    danger: egui::Color32,
    warning: egui::Color32,
    info: egui::Color32,
}

pub const BUILT_IN_THEMES: [(&str, &str); 9] = [
    ("gitcito", "Gitcito"),
    ("contrast", "Ultra Contrast"),
    ("midnight", "Midnight"),
    ("dracula", "Dracula"),
    ("nord", "Nord"),
    ("solarized", "Solarized"),
    ("github", "GitHub"),
    ("monokai", "Monokai"),
    ("daltonic", "Daltonic"),
];

pub fn tint(color: egui::Color32, alpha: u8) -> egui::Color32 {
    egui::Color32::from_rgba_unmultiplied(color.r(), color.g(), color.b(), alpha)
}

fn relative_luminance(color: egui::Color32) -> f32 {
    let linear = |channel: u8| {
        let value = f32::from(channel) / 255.0;
        if value <= 0.04045 {
            value / 12.92
        } else {
            ((value + 0.055) / 1.055).powf(2.4)
        }
    };
    0.2126 * linear(color.r()) + 0.7152 * linear(color.g()) + 0.0722 * linear(color.b())
}

fn contrasting_foreground(
    background: egui::Color32,
    preferred: egui::Color32,
    alternate: egui::Color32,
) -> egui::Color32 {
    let luminance = relative_luminance(background);
    [preferred, alternate, egui::Color32::WHITE, egui::Color32::BLACK]
        .into_iter()
        .max_by(|left, right| {
            let ratio = |foreground: egui::Color32| {
                let foreground = relative_luminance(foreground);
                (foreground.max(luminance) + 0.05) / (foreground.min(luminance) + 0.05)
            };
            ratio(*left).total_cmp(&ratio(*right))
        })
        .unwrap_or(preferred)
}

pub fn palette(ui: &egui::Ui) -> Palette {
    let theme = egui_components::theme::Theme::get(ui.ctx());
    Palette {
        surface: ui.visuals().window_fill,
        raised: ui.visuals().faint_bg_color,
        stroke: theme.colors.border,
        accent: theme.colors.ring,
        success: theme.colors.success_foreground,
        warning: theme.colors.warning_foreground,
        danger: theme.colors.danger_foreground,
    }
}

fn color(hex: &str) -> egui::Color32 {
    let value = u32::from_str_radix(hex.trim_start_matches('#'), 16).unwrap_or(0);
    egui::Color32::from_rgb((value >> 16) as u8, (value >> 8) as u8, value as u8)
}

fn theme_colors(theme_id: &str, dark: bool) -> ThemeColors {
    let gitcito = [
        ["#0f1220", "#141829", "#171b2d", "#1e2440", "#2a3158", "#edeffa", "#a9afcb", "#6b7299", "#6c5ce7", "#00e6a8", "#ff5c7a", "#ff7a1a", "#00d4ff"],
        ["#eef0f8", "#ffffff", "#f4f5fb", "#e8ebf6", "#d4d8ec", "#2b2d42", "#5a5f7d", "#8a90ad", "#6c5ce7", "#00b487", "#e23d63", "#e8690f", "#0aa6cc"],
    ];
    let colors = match (theme_id, dark) {
        ("contrast", true) => ["#000000", "#060608", "#0c0c12", "#15151f", "#3d3d4e", "#ffffff", "#d8d8e6", "#9a9ab2", "#8b7bff", "#00ffbf", "#ff476f", "#ff9e2c", "#22e0ff"],
        ("contrast", false) => ["#ffffff", "#ffffff", "#f2f2f4", "#e6e6ea", "#9a9aa8", "#000000", "#1a1a22", "#44444f", "#4b32d6", "#007d54", "#cc0033", "#a85600", "#0077aa"],
        ("midnight", true) => ["#0b0c11", "#0e0f15", "#14161f", "#1a1d29", "#262b3b", "#e8ecf5", "#aab2c5", "#6b7388", "#58a6ff", "#3fd0a4", "#e7596c", "#f2cc60", "#b585f7"],
        ("midnight", false) => ["#eef1f7", "#ffffff", "#f3f5fa", "#e6eaf3", "#cfd6e6", "#1c2433", "#4a5468", "#7b8699", "#2d6fe0", "#2a9d76", "#d23f54", "#b07a00", "#8a5cd6"],
        ("dracula", true) => ["#1a1b26", "#21222c", "#282a36", "#343746", "#3a3d4d", "#f8f8f2", "#c8c9d4", "#7f8195", "#bd93f9", "#50fa7b", "#ff5555", "#f1fa8c", "#ff79c6"],
        ("dracula", false) => ["#f3efe0", "#fdf9ec", "#ece7d6", "#dfd9c4", "#c8c0a6", "#1c1a14", "#46412f", "#736b50", "#7d4dd6", "#2a7a36", "#cb3a2a", "#9a6b00", "#b3247a"],
        ("nord", true) => ["#242933", "#2e3440", "#343b4c", "#3b4252", "#434c5e", "#eceff4", "#d8dee9", "#7b88a1", "#88c0d0", "#a3be8c", "#bf616a", "#ebcb8b", "#b48ead"],
        ("nord", false) => ["#e5e9f0", "#eceff4", "#dfe4ee", "#d8dee9", "#c2cad8", "#2e3440", "#434c5e", "#6b7488", "#5e81ac", "#4f7a3f", "#bf616a", "#a07e1f", "#9d6fa0"],
        ("solarized", true) => ["#002028", "#002b36", "#073642", "#0a4250", "#0f4f5e", "#fdf6e3", "#93a1a1", "#586e75", "#268bd2", "#859900", "#dc322f", "#b58900", "#6c71c4"],
        ("solarized", false) => ["#f7f0dd", "#fdf6e3", "#eee8d5", "#e3ddc8", "#d3cbb7", "#073642", "#586e75", "#93a1a1", "#268bd2", "#859900", "#dc322f", "#b58900", "#6c71c4"],
        ("github", true) => ["#010409", "#0d1117", "#161b22", "#21262d", "#30363d", "#e6edf3", "#adbac7", "#8b949e", "#2f81f7", "#3fb950", "#f85149", "#d29922", "#a371f7"],
        ("github", false) => ["#ffffff", "#f6f8fa", "#eaeef2", "#dde3ea", "#d0d7de", "#1f2328", "#454c54", "#6e7781", "#0969da", "#1a7f37", "#cf222e", "#9a6700", "#8250df"],
        ("monokai", true) => ["#1d1e19", "#272822", "#2f312a", "#3a3d33", "#3e3f36", "#f8f8f2", "#cfcfc2", "#75715e", "#66d9ef", "#a6e22e", "#f92672", "#e6db74", "#ae81ff"],
        ("monokai", false) => ["#f5f5ef", "#fafaf5", "#ecece4", "#deded4", "#c8c8bb", "#272822", "#49483e", "#75715e", "#00879e", "#5c8a00", "#c41a6e", "#9a6b00", "#7d4dd6"],
        ("daltonic", true) => ["#0d0f12", "#15181d", "#1b1f26", "#242a33", "#39414d", "#f0f3f7", "#b5bdc9", "#7a8494", "#56b4e9", "#009e73", "#d55e00", "#e69f00", "#cc79a7"],
        ("daltonic", false) => ["#eef1f5", "#ffffff", "#f3f5f9", "#e5e9f0", "#cdd4df", "#11161d", "#3f4854", "#6e7886", "#0072b2", "#009e73", "#d55e00", "#c98a00", "#b3568f"],
        (_, true) => gitcito[0],
        _ => gitcito[1],
    }.map(color);
    ThemeColors {
        canvas: colors[0], panel: colors[1], surface: colors[2], raised: colors[3],
        stroke: colors[4], text: colors[5], muted: colors[6], faint: colors[7],
        accent: colors[8], success: colors[9], danger: colors[10], warning: colors[11], info: colors[12],
    }
}

pub fn theme_card(ui: &mut egui::Ui, theme_id: &str, name: &str, selected: bool) -> egui::Response {
    let colors = theme_colors(theme_id, ui.visuals().dark_mode);
    let variant = if selected {
        egui_components::CardVariant::Outline
    } else {
        egui_components::CardVariant::Fill
    };
    egui_components::Card::new()
        .variant(variant)
        .padding(8.0)
        .show(ui, |ui| {
            let (preview, _) = ui.allocate_exact_size(
                egui::vec2(ui.available_width(), 56.0),
                egui::Sense::hover(),
            );
            if ui.is_rect_visible(preview) {
                let painter = ui.painter();
                painter.rect_filled(preview, 8.0, colors.canvas);
                painter.rect_filled(
                    egui::Rect::from_min_size(preview.min, egui::vec2(27.0, preview.height())),
                    egui::CornerRadius::same(8),
                    colors.panel,
                );
                painter.rect_filled(
                    egui::Rect::from_min_size(
                        egui::pos2(preview.left() + 6.0, preview.top() + 8.0),
                        egui::vec2(12.0, 3.0),
                    ),
                    2.0,
                    colors.accent,
                );
                painter.rect_filled(
                    egui::Rect::from_min_size(
                        egui::pos2(preview.left() + 6.0, preview.top() + 17.0),
                        egui::vec2(15.0, 3.0),
                    ),
                    2.0,
                    colors.muted,
                );
                painter.rect_filled(
                    egui::Rect::from_min_size(
                        egui::pos2(preview.left() + 35.0, preview.top() + 9.0),
                        egui::vec2((preview.width() - 47.0).max(12.0), 6.0),
                    ),
                    3.0,
                    colors.raised,
                );
                painter.circle_filled(
                    egui::pos2(preview.left() + 39.0, preview.top() + 31.0),
                    4.0,
                    colors.success,
                );
                painter.circle_filled(
                    egui::pos2(preview.left() + 51.0, preview.top() + 31.0),
                    4.0,
                    colors.warning,
                );
                painter.circle_filled(
                    egui::pos2(preview.left() + 63.0, preview.top() + 31.0),
                    4.0,
                    colors.danger,
                );
            }
            ui.add_space(6.0);
            ui.add(if selected {
                egui_components::Button::primary(name).full_width()
            } else {
                egui_components::Button::secondary(name).full_width()
            })
        })
        .inner
}

pub fn apply_theme(context: &egui::Context, dark: bool, theme_id: &str) {
    let colors = theme_colors(theme_id, dark);
    let mut visuals = if dark { egui::Visuals::dark() } else { egui::Visuals::light() };
    visuals.panel_fill = colors.canvas;
    visuals.window_fill = colors.panel;
    visuals.faint_bg_color = colors.raised;
    visuals.extreme_bg_color = colors.canvas;
    visuals.code_bg_color = colors.surface;
    visuals.hyperlink_color = colors.accent;
    visuals.selection.bg_fill = tint(colors.accent, if dark { 80 } else { 34 });
    visuals.selection.stroke = egui::Stroke::new(1.0, colors.accent);
    visuals.window_corner_radius = egui::CornerRadius::same(10);
    visuals.menu_corner_radius = egui::CornerRadius::same(8);
    visuals.window_stroke = egui::Stroke::new(1.0, colors.stroke);
    visuals.widgets.noninteractive.bg_fill = colors.panel;
    visuals.widgets.noninteractive.bg_stroke = egui::Stroke::new(1.0, colors.stroke);
    visuals.widgets.inactive.bg_fill = colors.surface;
    visuals.widgets.inactive.weak_bg_fill = colors.raised;
    visuals.widgets.inactive.bg_stroke = egui::Stroke::new(1.0, colors.stroke);
    visuals.widgets.hovered.bg_fill = tint(colors.accent, if dark { 48 } else { 26 });
    visuals.widgets.hovered.bg_stroke = egui::Stroke::new(1.0, tint(colors.accent, 128));
    visuals.widgets.active.bg_fill = tint(colors.accent, if dark { 88 } else { 56 });
    visuals.widgets.active.bg_stroke = egui::Stroke::new(1.0, colors.accent);
    visuals.widgets.open.bg_fill = colors.raised;
    visuals.widgets.open.bg_stroke = egui::Stroke::new(1.0, colors.stroke);
    for widget in [
        &mut visuals.widgets.noninteractive,
        &mut visuals.widgets.inactive,
        &mut visuals.widgets.hovered,
        &mut visuals.widgets.active,
        &mut visuals.widgets.open,
    ] {
        widget.corner_radius = egui::CornerRadius::same(6);
    }
    visuals.button_frame = true;
    visuals.striped = false;
    context.set_visuals(visuals);
    context.style_mut(|style| {
        style.spacing.item_spacing = egui::vec2(8.0, 6.0);
        style.spacing.window_margin = egui::Margin::same(18);
        style.spacing.button_padding = egui::vec2(11.0, 7.0);
        style.spacing.interact_size = egui::vec2(36.0, 34.0);
        style.text_styles.insert(egui::TextStyle::Heading, egui::FontId::proportional(22.0));
        style.text_styles.insert(egui::TextStyle::Body, egui::FontId::proportional(13.5));
        style.text_styles.insert(egui::TextStyle::Button, egui::FontId::proportional(12.5));
        style.text_styles.insert(egui::TextStyle::Small, egui::FontId::proportional(11.5));
        style.text_styles.insert(egui::TextStyle::Monospace, egui::FontId::monospace(13.0));
        style.visuals.override_text_color = Some(colors.text);
        style.visuals.weak_text_color = Some(colors.faint);
    });
    let mut component_theme = if dark {
        egui_components::theme::Theme::dark()
    } else {
        egui_components::theme::Theme::light()
    };
    component_theme.colors.background = colors.canvas;
    component_theme.colors.foreground = colors.text;
    component_theme.colors.border = colors.stroke;
    component_theme.colors.ring = colors.accent;
    component_theme.colors.primary_background = colors.accent;
    component_theme.colors.primary_foreground =
        contrasting_foreground(colors.accent, colors.text, colors.canvas);
    component_theme.colors.primary_hover_background = colors.accent.gamma_multiply(0.86);
    component_theme.colors.primary_active_background = colors.accent.gamma_multiply(0.72);
    component_theme.colors.secondary_background = colors.raised;
    component_theme.colors.secondary_foreground = component_theme.colors.foreground;
    component_theme.colors.secondary_hover_background = tint(colors.accent, if dark { 40 } else { 22 });
    component_theme.colors.accent_background = tint(colors.accent, if dark { 48 } else { 28 });
    component_theme.colors.accent_foreground = colors.accent;
    component_theme.colors.muted_background = colors.surface;
    component_theme.colors.muted_foreground = colors.muted;
    component_theme.colors.success_background = tint(colors.success, if dark { 42 } else { 26 });
    component_theme.colors.success_foreground = colors.success;
    component_theme.colors.warning_background = tint(colors.warning, if dark { 42 } else { 26 });
    component_theme.colors.warning_foreground = colors.warning;
    component_theme.colors.danger_background = tint(colors.danger, if dark { 42 } else { 26 });
    component_theme.colors.danger_foreground = colors.danger;
    component_theme.colors.info_background = tint(colors.info, if dark { 42 } else { 26 });
    component_theme.colors.info_foreground = colors.info;
    component_theme.colors.input_border = colors.stroke;
    component_theme.colors.popover_background = colors.panel;
    component_theme.colors.popover_foreground = component_theme.colors.foreground;
    component_theme.colors.link_foreground = colors.accent;
    component_theme.colors.link_hover_foreground = component_theme.colors.primary_hover_background;
    component_theme.colors.selection_background = tint(colors.accent, 80);
    component_theme.colors.slider_bar_background = colors.accent;
    component_theme.colors.slider_thumb_background = colors.accent;
    component_theme.colors.switch_background = colors.accent;
    component_theme.install(context);
}

pub fn button(ui: &mut egui::Ui, label: &str, kind: ButtonKind) -> egui::Response {
    let button = match kind {
        ButtonKind::Primary => egui_components::Button::primary(label),
        ButtonKind::Secondary => egui_components::Button::secondary(label),
        ButtonKind::Quiet => egui_components::Button::ghost(label),
        ButtonKind::Danger => egui_components::Button::danger(label),
    };
    ui.add(button)
}

pub fn button_enabled(
    ui: &mut egui::Ui,
    label: &str,
    kind: ButtonKind,
    enabled: bool,
) -> egui::Response {
    let button = match kind {
        ButtonKind::Primary => egui_components::Button::primary(label),
        ButtonKind::Secondary => egui_components::Button::secondary(label),
        ButtonKind::Quiet => egui_components::Button::ghost(label),
        ButtonKind::Danger => egui_components::Button::danger(label),
    };
    ui.add(button.disabled(!enabled))
}

pub fn action_button(ui: &mut egui::Ui, label: impl Into<egui::WidgetText>) -> egui::Response {
    ui.add(egui_components::Button::secondary(label))
}

pub fn icon_button(
    ui: &mut egui::Ui,
    glyph: &str,
    tooltip: &str,
    kind: ButtonKind,
) -> egui::Response {
    let palette = palette(ui);
    let button = match kind {
        ButtonKind::Primary => egui_components::Button::primary(" "),
        ButtonKind::Secondary => egui_components::Button::secondary(" "),
        ButtonKind::Quiet => egui_components::Button::ghost(" "),
        ButtonKind::Danger => egui_components::Button::danger(" "),
    };
    let response = ui.add(button.large().min_width(38.0));
    let icon_color = match glyph {
        "★" => palette.warning,
        "☆" => palette.accent,
        _ => ui.visuals().text_color(),
    };
    let icon = match glyph {
        "⚙" => Some(egui_components::IconKind::Settings),
        "★" | "☆" => Some(egui_components::IconKind::Star),
        "＋" | "+" => Some(egui_components::IconKind::Plus),
        "×" | "✕" => Some(egui_components::IconKind::Close),
        "▸" | "›" => Some(egui_components::IconKind::ChevronRight),
        "▾" => Some(egui_components::IconKind::ChevronDown),
        "‹" | "⇤" => Some(egui_components::IconKind::ChevronLeft),
        "⌕" => Some(egui_components::IconKind::Search),
        "!" => Some(egui_components::IconKind::Warning),
        "i" => Some(egui_components::IconKind::Info),
        "▤" => Some(egui_components::IconKind::File),
        _ => None,
    };
    if let Some(icon) = icon {
        let mut icon_ui = ui.new_child(egui::UiBuilder::new().max_rect(response.rect));
        icon_ui.centered_and_justified(|icon_ui| {
            icon_ui.add(egui_components::Icon::new(icon).size(18.0).color(icon_color));
        });
    } else {
        paint_icon(ui.painter(), response.rect.center(), glyph, icon_color);
    }
    response.on_hover_text(tooltip)
}

pub fn more_button(ui: &mut egui::Ui, tooltip: &str) -> egui::Response {
    let response = ui.add(egui_components::Button::ghost(" ").small().min_width(36.0));
    let color = ui.visuals().text_color();
    for offset in [-5.0, 0.0, 5.0] {
        ui.painter().circle_filled(
            response.rect.center() + egui::vec2(offset, 0.0),
            1.5,
            color,
        );
    }
    response.on_hover_text(tooltip)
}

pub fn component_icon_button(
    ui: &mut egui::Ui,
    icon: egui_components::IconKind,
    tooltip: &str,
    kind: ButtonKind,
) -> egui::Response {
    let button = match kind {
        ButtonKind::Primary => egui_components::Button::primary(" "),
        ButtonKind::Secondary => egui_components::Button::secondary(" "),
        ButtonKind::Quiet => egui_components::Button::ghost(" "),
        ButtonKind::Danger => egui_components::Button::danger(" "),
    };
    let response = ui.add(button.large().min_width(38.0));
    let mut icon_ui = ui.new_child(egui::UiBuilder::new().max_rect(response.rect));
    icon_ui.centered_and_justified(|icon_ui| {
        icon_ui.add(egui_components::Icon::new(icon).size(18.0));
    });
    response.on_hover_text(tooltip)
}

fn paint_icon(painter: &egui::Painter, center: egui::Pos2, glyph: &str, color: egui::Color32) {
    let icon = match glyph {
        "⚙" => "\u{E270}",
        "◉" | "◌" => "\u{E278}",
        "★" | "☆" => "\u{E46A}",
        "↻" => "\u{E036}",
        "＋" => "\u{E3D4}",
        "×" => "\u{E4F6}",
        "↓" => "\u{E03E}",
        "▸" | "›" => "\u{E13A}",
        "▾" => "\u{E136}",
        "‹" => "\u{E138}",
        "⇤" => "\u{E062}",
        "⇥" => "\u{E064}",
        "▤" => "\u{E23A}",
        "▦" => "\u{E464}",
        "↶" => "\u{E038}",
        "›_" => "\u{EAE8}",
        "↗" => "\u{E092}",
        _ => glyph,
    };
    painter.text(
        center,
        egui::Align2::CENTER_CENTER,
        icon,
        egui::FontId::new(19.0, egui::FontFamily::Name("phosphor".into())),
        color,
    );
}


/// Draw Gitcito's branch graph mark. `changed` is `None` when worktree status is unknown.
pub fn repository_mark(ui: &mut egui::Ui, size: f32, changed: Option<bool>) {
    let palette = palette(ui);
    let (rect, _) = ui.allocate_exact_size(egui::vec2(size, size), egui::Sense::hover());
    let radius = size * 0.28;
    ui.painter().rect_filled(rect, radius, tint(palette.accent, 24));
    ui.painter().rect_stroke(
        rect,
        radius,
        egui::Stroke::new(1.0, tint(palette.accent, 48)),
        egui::StrokeKind::Inside,
    );

    let point = |x: f32, y: f32| egui::pos2(rect.left() + size * x, rect.top() + size * y);
    let graph_stroke = egui::Stroke::new((size * 0.055).max(1.4), palette.accent);
    let left_top = point(0.34, 0.27);
    let left_bottom = point(0.34, 0.73);
    let right_top = point(0.68, 0.27);
    let right_bottom = point(0.68, 0.73);
    ui.painter().line_segment([left_top, left_bottom], graph_stroke);
    ui.painter().line_segment([left_top, right_top], graph_stroke);
    ui.painter().line_segment([right_top, right_bottom], graph_stroke);
    for node in [left_top, left_bottom, right_top, right_bottom] {
        ui.painter().circle_filled(node, size * 0.105, palette.surface);
        ui.painter().circle_stroke(node, size * 0.105, graph_stroke);
    }

    let status = match changed {
        Some(true) => palette.warning,
        Some(false) => palette.success,
        None => ui.visuals().weak_text_color(),
    };
    let status_center = rect.right_bottom() - egui::vec2(size * 0.13, size * 0.13);
    ui.painter().circle_filled(status_center, size * 0.115, palette.surface);
    ui.painter().circle_filled(status_center, size * 0.075, status);
}

pub fn badge(ui: &mut egui::Ui, label: &str, kind: BadgeKind) -> egui::Response {
    let variant = match kind {
        BadgeKind::Accent => egui_components::Variant::Info,
        BadgeKind::Success => egui_components::Variant::Success,
        BadgeKind::Warning => egui_components::Variant::Warning,
        BadgeKind::Danger => egui_components::Variant::Danger,
        BadgeKind::Neutral => egui_components::Variant::Secondary,
    };
    ui.add(egui_components::Badge::new(label).variant(variant))
}

pub fn ref_badge(ui: &mut egui::Ui, label: &str, kind: BadgeKind) -> egui::Response {
    let variant = match kind {
        BadgeKind::Accent => egui_components::Variant::Info,
        BadgeKind::Success => egui_components::Variant::Success,
        BadgeKind::Warning => egui_components::Variant::Warning,
        BadgeKind::Danger => egui_components::Variant::Danger,
        BadgeKind::Neutral => egui_components::Variant::Secondary,
    };
    ui.add(egui_components::Badge::new(label).variant(variant).outlined())
}

pub fn surface_frame(ui: &egui::Ui) -> egui::Frame {
    let palette = palette(ui);
    egui::Frame::new()
        .fill(palette.raised)
        .stroke(egui::Stroke::new(1.0, palette.stroke.gamma_multiply(0.8)))
        .corner_radius(13)
        .inner_margin(egui::Margin::same(14))
}

pub fn app_bar_frame(ui: &egui::Ui) -> egui::Frame {
    egui::Frame::new()
        .fill(ui.visuals().window_fill)
        .inner_margin(egui::Margin::symmetric(14, 7))
}

pub fn toolbar_row_frame() -> egui::Frame {
    egui::Frame::new()
        .fill(egui::Color32::TRANSPARENT)
        .inner_margin(egui::Margin::symmetric(2, 3))
}

pub fn segmented_frame(ui: &egui::Ui) -> egui::Frame {
    egui::Frame::new()
        .fill(palette(ui).raised)
        .corner_radius(11)
        .inner_margin(egui::Margin::same(5))
}

pub fn terminal_frame(ui: &egui::Ui) -> egui::Frame {
    let palette = palette(ui);
    egui::Frame::new()
        .fill(palette.raised)
        .stroke(egui::Stroke::new(1.0, palette.stroke))
        .corner_radius(14)
        .inner_margin(egui::Margin::same(10))
}

pub fn card<R>(
    ui: &mut egui::Ui,
    body: impl FnOnce(&mut egui::Ui) -> R,
) -> egui::InnerResponse<R> {
    egui_components::Card::new()
        .fill()
        .padding(12.0)
        .show(ui, body)
}

pub fn activity_entry<R>(
    ui: &mut egui::Ui,
    author: &str,
    timestamp: &str,
    body: impl FnOnce(&mut egui::Ui) -> R,
) -> egui::InnerResponse<R> {
    egui::Frame::new()
        .inner_margin(egui::Margin::symmetric(2, 8))
        .show(ui, |ui| {
            ui.horizontal(|ui| {
                ui.add(egui_components::Avatar::from_name(author).size(30.0));
                ui.vertical(|ui| {
                    ui.label(egui::RichText::new(format!("@{author}")).strong());
                    ui.weak(timestamp);
                });
            });
            ui.add_space(6.0);
            body(ui)
        })
}

pub fn search_field(ui: &mut egui::Ui, value: &mut String, hint: &str) -> egui::Response {
    ui.add(
        egui_components::Input::new(value)
            .placeholder(hint)
            .width(ui.available_width()),
    )
}

pub fn input(
    ui: &mut egui::Ui,
    value: &mut String,
    hint: &str,
    width: Option<f32>,
) -> egui::Response {
    let input = egui_components::Input::new(value).placeholder(hint);
    ui.add(match width {
        Some(width) => input.width(width),
        None => input,
    })
}

pub fn textarea(
    ui: &mut egui::Ui,
    value: &mut String,
    hint: &str,
    height: f32,
) -> egui::Response {
    let palette = palette(ui);
    let frame = egui::Frame::new()
        .fill(ui.visuals().extreme_bg_color)
        .stroke(egui::Stroke::new(1.0, palette.stroke))
        .corner_radius(11)
        .inner_margin(egui::Margin::same(10));
    frame.show(ui, |ui| {
        ui.add_sized(
            [ui.available_width(), height],
            egui::TextEdit::multiline(value)
                .hint_text(hint)
                .frame(egui::Frame::new()
                    .fill(egui::Color32::TRANSPARENT)
                    .stroke(egui::Stroke::NONE)
                    .inner_margin(egui::Margin::ZERO))
                .desired_rows((height / 22.0).round().max(2.0) as usize),
        )
    }).inner
}

pub fn password_input(
    ui: &mut egui::Ui,
    value: &mut String,
    hint: &str,
    width: Option<f32>,
) -> egui::Response {
    let input = egui_components::Input::new(value).placeholder(hint).password(true);
    ui.add(match width {
        Some(width) => input.width(width),
        None => input,
    })
}

pub fn checkbox(
    ui: &mut egui::Ui,
    checked: &mut bool,
    label: impl Into<egui::WidgetText>,
) -> egui::Response {
    ui.add(egui_components::Checkbox::new(checked, label))
}

pub fn list_item(
    ui: &mut egui::Ui,
    label: impl Into<egui::WidgetText>,
    selected: bool,
) -> egui::Response {
    ui.add(egui_components::ListItem::new(label).selected(selected))
}

pub fn file_change_item(
    ui: &mut egui::Ui,
    name: &str,
    parent: &str,
    selected: bool,
    width: f32,
) -> egui::Response {
    let theme = egui_components::theme::Theme::get(ui.ctx());
    let height = 44.0;
    let (rect, response) = ui.allocate_exact_size(egui::vec2(width, height), egui::Sense::click());
    if ui.is_rect_visible(rect) {
        let background = if selected {
            theme.colors.secondary_background
        } else if response.is_pointer_button_down_on() || response.hovered() {
            theme.colors.accent_background
        } else {
            egui::Color32::TRANSPARENT
        };
        if background != egui::Color32::TRANSPARENT {
            ui.painter().rect_filled(rect, theme.corner_sm(), background);
        }
        if selected {
            ui.painter().rect_filled(
                egui::Rect::from_min_size(
                    egui::pos2(rect.left(), rect.top() + 7.0),
                    egui::vec2(2.0, rect.height() - 14.0),
                ),
                egui::CornerRadius::same(1),
                theme.colors.primary_background,
            );
        }

        let text_rect = rect.shrink2(egui::vec2(10.0, 5.0));
        let painter = ui.painter().with_clip_rect(text_rect);
        let name_galley = painter.layout_no_wrap(
            name.to_owned(),
            egui::FontId::proportional(theme.metrics.font_size_sm),
            theme.colors.foreground,
        );
        painter.galley_with_override_text_color(
            egui::pos2(text_rect.left(), text_rect.top()),
            name_galley,
            theme.colors.foreground,
        );
        if !parent.is_empty() {
            let parent_galley = painter.layout_no_wrap(
                parent.to_owned(),
                egui::FontId::proportional(theme.metrics.font_size_xs),
                theme.colors.muted_foreground,
            );
            painter.galley_with_override_text_color(
                egui::pos2(text_rect.left(), text_rect.top() + 19.0),
                parent_galley,
                theme.colors.muted_foreground,
            );
        }
        if response.has_focus() {
            ui.painter().rect_stroke(
                rect.expand(1.0),
                theme.corner_sm(),
                theme.focus_ring(),
                egui::StrokeKind::Outside,
            );
        }
    }
    if response.hovered() {
        ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
    }
    response
}

pub fn select(
    ui: &mut egui::Ui,
    id: impl std::hash::Hash,
    selected: &mut Option<usize>,
    options: &[String],
    placeholder: &str,
    width: Option<f32>,
) -> egui::Response {
    let select = egui_components::Select::new(id, selected)
        .options(options.iter().cloned())
        .placeholder(placeholder);
    match width {
        Some(width) => select.width(width).show(ui),
        None => select.show(ui),
    }
}

pub fn combobox(
    ui: &mut egui::Ui,
    id: impl std::hash::Hash,
    selected: &mut Option<usize>,
    options: &[String],
    placeholder: &str,
    width: Option<f32>,
) -> egui::Response {
    let select = egui_components::Select::combobox(id, selected)
        .options(options.iter().cloned())
        .placeholder(placeholder);
    match width {
        Some(width) => select.width(width).show(ui),
        None => select.show(ui),
    }
}

pub fn confirm_dialog(
    context: &egui::Context,
    open: &mut bool,
    title: &str,
    description: &str,
    confirm_label: &str,
    cancel_label: &str,
    danger: bool,
) -> Option<egui_components::AlertChoice> {
    let dialog = egui_components::AlertDialog::new(title)
        .description(description)
        .confirm_label(confirm_label)
        .cancel_label(cancel_label);
    if danger {
        dialog.danger().show(context, open)
    } else {
        dialog.show(context, open)
    }
}

pub fn section_heading(ui: &mut egui::Ui, title: &str, count: Option<usize>) {
    let accent = palette(ui).accent;
    ui.horizontal(|ui| {
        let (marker, _) = ui.allocate_exact_size(egui::vec2(3.0, 16.0), egui::Sense::hover());
        ui.painter().rect_filled(marker, 2.0, accent);
        ui.add_space(2.0);
        ui.label(egui::RichText::new(title).strong().size(14.0));
        if let Some(count) = count {
            badge(ui, &count.to_string(), BadgeKind::Neutral);
        }
    });
    ui.add_space(3.0);
}

pub fn selection_row(selected: bool, accent: egui::Color32) -> egui::Frame {
    egui::Frame::new()
        .fill(if selected { tint(accent, 18) } else { egui::Color32::TRANSPARENT })
        .stroke(egui::Stroke::NONE)
        .corner_radius(7)
        .inner_margin(egui::Margin::symmetric(9, 4))
}

pub fn empty_state(ui: &mut egui::Ui, glyph: &str, title: &str) {
    card(ui, |ui| empty_state_content(ui, glyph, title));
}

pub fn empty_state_content(ui: &mut egui::Ui, glyph: &str, title: &str) {
    let palette = palette(ui);
    ui.set_width(ui.available_width());
    ui.vertical_centered(|ui| {
        ui.add_space(14.0);
        let icon = match glyph {
            "✓" => Some(egui_components::IconKind::Check),
            "⌕" => Some(egui_components::IconKind::Search),
            "▤" | "▣" => Some(egui_components::IconKind::File),
            "◉" | "♢" => Some(egui_components::IconKind::Info),
            _ => None,
        };
        if let Some(icon) = icon {
            ui.add(egui_components::Icon::new(icon).size(28.0).color(palette.accent));
        } else {
            ui.label(egui::RichText::new(glyph).size(26.0).color(palette.accent));
        }
        ui.add_space(4.0);
        ui.label(egui::RichText::new(title).strong());
        ui.add_space(14.0);
    });
}

pub fn repository_empty_state(
    ui: &mut egui::Ui,
    message: &str,
    open_label: &str,
    clone_label: &str,
) -> (bool, bool) {
    let width = ui.available_width().min(560.0);
    let mut open = false;
    let mut clone = false;
    ui.horizontal(|ui| {
        ui.add_space(((ui.available_width() - width) / 2.0).max(0.0));
        egui::Frame::new()
            .fill(palette(ui).surface)
            .stroke(egui::Stroke::new(1.0, palette(ui).stroke))
            .corner_radius(18)
            .inner_margin(egui::Margin::symmetric(28, 26))
            .show(ui, |ui| {
                ui.set_min_width((width - 56.0).max(240.0));
                ui.vertical_centered(|ui| {
                    repository_mark(ui, 54.0, None);
                    ui.add_space(12.0);
                    ui.label(egui::RichText::new("Gitcito").strong().size(24.0));
                    ui.add_space(6.0);
                    ui.label(egui::RichText::new(message)
                        .color(ui.visuals().weak_text_color()));
                    ui.add_space(18.0);
                    ui.horizontal(|ui| {
                        open = button(ui, open_label, ButtonKind::Primary).clicked();
                        clone = button(ui, clone_label, ButtonKind::Secondary).clicked();
                    });
                });
            });
    });
    (open, clone)
}

pub fn form_field(ui: &mut egui::Ui, label: &str, edit: impl FnOnce(&mut egui::Ui)) {
    ui.horizontal(|ui| {
        ui.add_sized(
            [150.0, 32.0],
            egui::Label::new(egui::RichText::new(label).small().weak()),
        );
        edit(ui);
    });
}
