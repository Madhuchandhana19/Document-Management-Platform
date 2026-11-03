import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("diagrams", exist_ok=True)

# 1. Generate VS Code Logo
def generate_vscode_logo():
    fig, ax = plt.subplots(figsize=(4, 4), dpi=300)
    ax.set_facecolor('#ffffff')
    ax.plot([0.2, 0.5, 0.2, 0.8, 0.2], [0.5, 0.8, 0.2, 0.8, 0.5], color='#007ACC', lw=8)
    ax.text(0.5, 0.05, "Visual Studio Code", fontsize=14, fontweight='bold', ha='center', color='#333333')
    ax.axis('off')
    plt.tight_layout()
    plt.savefig("diagrams/vscode_logo.png", bbox_inches='tight')
    plt.close()

# 2. Use Case Diagram
def generate_use_case_diagram():
    fig, ax = plt.subplots(figsize=(8, 10), dpi=300)
    ax.set_facecolor('#fafafa')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 12)
    ax.axis('off')

    rect = patches.Rectangle((3, 0.5), 6.5, 11, linewidth=2, edgecolor='#003366', facecolor='#ffffff', linestyle='--')
    ax.add_patch(rect)
    ax.text(6.25, 11.2, "Document Management System", fontsize=11, fontweight='bold', ha='center', color='#003366')

    actors = [
        ("User / Editor", 1.5, 9.5),
        ("Approver", 1.5, 6.5),
        ("Admin", 1.5, 3.5),
    ]

    for name, x, y in actors:
        ax.add_patch(patches.Circle((x, y+0.4), 0.25, color='#333333'))
        ax.plot([x, x], [y+0.15, y-0.4], color='#333333', lw=2)
        ax.plot([x-0.3, x+0.3], [y-0.1, y-0.1], color='#333333', lw=2)
        ax.plot([x-0.3, x], [y-0.8, y-0.4], color='#333333', lw=2)
        ax.plot([x+0.3, x], [y-0.8, y-0.4], color='#333333', lw=2)
        ax.text(x, y-1.1, name, fontsize=10, fontweight='bold', ha='center', color='#111111')

    use_cases = [
        ("User Login & Register", 6.25, 10.2, [0, 1, 2]),
        ("Upload Document", 6.25, 9.1, [0]),
        ("View & Search Documents", 6.25, 8.0, [0, 1, 2]),
        ("Manage Document Versions", 6.25, 6.9, [0]),
        ("Initiate Approval Workflow", 6.25, 5.8, [0]),
        ("Approve / Reject Workflow", 6.25, 4.7, [1]),
        ("Manage Access Controls", 6.25, 3.6, [0, 2]),
        ("View Audit Logs & Compliance", 6.25, 2.5, [2]),
        ("System Configuration & Analytics", 6.25, 1.4, [2]),
    ]

    actor_coords = [(1.8, 9.5), (1.8, 6.5), (1.8, 3.5)]

    for title, cx, cy, connected_actors in use_cases:
        ellipse = patches.Ellipse((cx, cy), 3.4, 0.75, linewidth=1.5, edgecolor='#0066cc', facecolor='#e6f2ff')
        ax.add_patch(ellipse)
        ax.text(cx, cy, title, fontsize=8.5, fontweight='semibold', ha='center', va='center', color='#002244')

        for aid in connected_actors:
            ax.annotate("", xy=(cx-1.7, cy), xytext=actor_coords[aid],
                        arrowprops=dict(arrowstyle="->", color="#666666", lw=1))

    plt.tight_layout()
    plt.savefig("diagrams/use_case_diagram.png", bbox_inches='tight')
    plt.close()

# 3. Sequence Diagram
def generate_sequence_diagram():
    fig, ax = plt.subplots(figsize=(9, 7), dpi=300)
    ax.set_facecolor('#ffffff')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 8)
    ax.axis('off')

    lifelines = [
        ("User", 1.0),
        ("WebApp (React)", 3.0),
        ("DocumentService", 5.0),
        ("WorkflowService", 7.0),
        ("Database", 9.0)
    ]

    for name, x in lifelines:
        box = patches.FancyBboxPatch((x-0.7, 7.2), 1.4, 0.5, facecolor='#003366', edgecolor='#002244', boxstyle="round,pad=0.1")
        ax.add_patch(box)
        ax.text(x, 7.45, name, fontsize=8.5, fontweight='bold', color='white', ha='center')
        ax.plot([x, x], [1.0, 7.2], color='#999999', linestyle='--')

    arrows = [
        (1.0, 3.0, 6.7, "1. Select document & file upload", "-"),
        (3.0, 5.0, 6.1, "2. POST /api/documents/upload", "-"),
        (5.0, 9.0, 5.5, "3. Save metadata & version (DB)", "-"),
        (9.0, 5.0, 4.9, "4. Return document details", "--"),
        (3.0, 7.0, 4.2, "5. POST /api/workflows/initiate", "-"),
        (7.0, 9.0, 3.6, "6. Create approval record (Pending)", "-"),
        (9.0, 7.0, 3.0, "7. Workflow created successfully", "--"),
        (7.0, 3.0, 2.4, "8. Return status & notify approvers", "--"),
        (3.0, 1.0, 1.8, "9. Display upload & workflow confirmation", "--"),
    ]

    for x1, x2, y, label, style in arrows:
        ax.annotate("", xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle="->", color="#005580", lw=1.2, linestyle=style))
        ax.text((x1 + x2)/2, y + 0.12, label, fontsize=7.5, ha='center', color='#222222', fontweight='semibold')

    plt.tight_layout()
    plt.savefig("diagrams/sequence_diagram.png", bbox_inches='tight')
    plt.close()

# 4. Data Flow Diagram (DFD)
def generate_dfd_diagram():
    fig, ax = plt.subplots(figsize=(8, 9), dpi=300)
    ax.set_facecolor('#ffffff')
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    nodes = [
        ("Start / Login", 5.0, 9.3, "ellipse"),
        ("Is User Authenticated?", 5.0, 8.1, "rhombus"),
        ("Register / Login Page", 2.2, 8.1, "box"),
        ("Validate JWT & Role", 5.0, 6.9, "box"),
        ("Role Check: Admin?", 5.0, 5.7, "rhombus"),
        ("Admin Dashboard", 2.2, 4.5, "box"),
        ("Document Workspace", 7.8, 4.5, "box"),
        ("Upload / Search Document", 7.8, 3.3, "box"),
        ("Approval Workflow Processing", 7.8, 2.1, "box"),
        ("Database / Storage Engine", 5.0, 1.0, "box"),
    ]

    for name, x, y, shape in nodes:
        if shape == "ellipse":
            ax.add_patch(patches.Ellipse((x, y), 2.2, 0.7, facecolor='#e6f0fa', edgecolor='#003366', lw=1.5))
        elif shape == "rhombus":
            pts = [[x, y+0.45], [x+1.5, y], [x, y-0.45], [x-1.5, y]]
            ax.add_patch(patches.Polygon(pts, facecolor='#fff2e6', edgecolor='#cc6600', lw=1.5))
        elif shape == "box":
            box = patches.FancyBboxPatch((x-1.2, y-0.3), 2.4, 0.6, facecolor='#e8f5e9', edgecolor='#2e7d32', lw=1.5, boxstyle="round,pad=0.05")
            ax.add_patch(box)

        ax.text(x, y, name, fontsize=8, fontweight='bold', ha='center', va='center', color='#111111')

    flow = [
        (5.0, 8.95, 5.0, 8.55, ""),
        (3.5, 8.1, 3.4, 8.1, "No"),
        (5.0, 7.65, 5.0, 7.2, "Yes"),
        (5.0, 6.6, 5.0, 6.15, ""),
        (3.5, 5.7, 2.2, 4.8, "Admin"),
        (6.5, 5.7, 7.8, 4.8, "User / Approver"),
        (7.8, 4.2, 7.8, 3.6, ""),
        (7.8, 3.0, 7.8, 2.4, ""),
        (7.8, 1.8, 5.5, 1.3, "Save"),
        (2.2, 4.2, 4.5, 1.3, "Manage"),
    ]

    for x1, y1, x2, y2, txt in flow:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#333333", lw=1.2))
        if txt:
            ax.text((x1+x2)/2 + 0.1, (y1+y2)/2, txt, fontsize=7.5, fontweight='bold', color='#cc3300')

    plt.tight_layout()
    plt.savefig("diagrams/dfd_diagram.png", bbox_inches='tight')
    plt.close()

generate_vscode_logo()
generate_use_case_diagram()
generate_sequence_diagram()
generate_dfd_diagram()
print("All 4 diagrams generated successfully!")
