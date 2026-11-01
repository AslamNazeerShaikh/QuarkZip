import QuarkZipKit
import SwiftUI

/// Dense filter strip: search, category chips, sort, density.
struct FilterBarView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("density") private var density: QZDensity = .compact

    var body: some View {
        @Bindable var model = model
        HStack(spacing: QZTheme.Space.s) {
            searchField

            Rectangle()
                .fill(QZTheme.Palette.separator)
                .frame(width: 1, height: 18)
                .padding(.horizontal, QZTheme.Space.xxs)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: QZTheme.Space.xs) {
                    QZFilterChip(
                        title: "All",
                        count: model.filterCounts[.all],
                        tint: QZTheme.Palette.accent,
                        isSelected: model.filter == .all
                    ) {
                        model.filter = .all
                    }

                    ForEach(visibleCategories, id: \.self) { category in
                        QZFilterChip(
                            title: category.displayName,
                            count: model.filterCounts[.category(category)],
                            tint: QZTheme.Palette.category(category),
                            isSelected: model.filter == .category(category)
                        ) {
                            model.filter = .category(category)
                        }
                    }

                    if (model.filterCounts[.encrypted] ?? 0) > 0 {
                        QZFilterChip(
                            title: "Encrypted",
                            count: model.filterCounts[.encrypted],
                            tint: QZTheme.Palette.warning,
                            isSelected: model.filter == .encrypted
                        ) {
                            model.filter = .encrypted
                        }
                    }

                    if (model.filterCounts[.large] ?? 0) > 0 {
                        QZFilterChip(
                            title: "Large",
                            count: model.filterCounts[.large],
                            tint: QZTheme.Palette.danger,
                            isSelected: model.filter == .large
                        ) {
                            model.filter = .large
                        }
                    }
                }
                .padding(.vertical, 1)
            }
            .layoutPriority(1)

            sortMenu
            densityMenu
        }
        .padding(.horizontal, QZTheme.Space.l)
        .frame(height: QZTheme.Size.filterBar)
        .background(QZTheme.Palette.filterBackground)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(QZTheme.Palette.separator)
                .frame(height: 1)
        }
    }

    private var visibleCategories: [EntryCategory] {
        EntryCategory.allCases.filter {
            $0 != .other && (model.filterCounts[.category($0)] ?? 0) > 0
        }
    }

    private var searchField: some View {
        @Bindable var model = model
        return HStack(spacing: QZTheme.Space.xs) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(QZTheme.Palette.tertiary)
            TextField("Search entries", text: $model.searchText)
                .textFieldStyle(.plain)
                .font(QZTheme.Typography.callout)
            if !model.searchText.isEmpty {
                Button {
                    model.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(QZTheme.Palette.tertiary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, QZTheme.Space.s)
        .frame(width: 178, height: 24)
        .background(QZTheme.Palette.content,
                    in: RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: QZTheme.Radius.control, style: .continuous)
                .strokeBorder(QZTheme.Palette.cardBorder, lineWidth: 0.5)
        }
    }

    private var sortMenu: some View {
        @Bindable var model = model
        return Menu {
            Picker("Sort By", selection: $model.sort.field) {
                ForEach(EntrySortField.allCases, id: \.self) { field in
                    Text(title(for: field)).tag(field)
                }
            }
            Divider()
            Toggle("Folders First", isOn: $model.sort.foldersFirst)
            Button {
                model.sort.ascending.toggle()
            } label: {
                Label(model.sort.ascending ? "Ascending" : "Descending",
                      systemImage: model.sort.ascending ? "arrow.up" : "arrow.down")
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
                .font(QZTheme.Typography.caption)
                .labelStyle(.iconOnly)
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .help("Sort entries")
    }

    private var densityMenu: some View {
        Menu {
            Picker("Density", selection: $density) {
                ForEach(QZDensity.allCases) { option in
                    Text(option.title).tag(option)
                }
            }
        } label: {
            Label("Density", systemImage: "list.bullet")
                .font(QZTheme.Typography.caption)
                .labelStyle(.iconOnly)
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .help("Row density")
    }

    private func title(for field: EntrySortField) -> String {
        switch field {
        case .name: return "Name"
        case .size: return "Size"
        case .packedSize: return "Packed Size"
        case .modified: return "Modified"
        case .kind: return "Kind"
        }
    }
}
