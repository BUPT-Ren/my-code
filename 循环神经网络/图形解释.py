import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(1, 1, figsize=(14, 6))

# 标题
ax.set_title('RNN Forward Pass with Batch=2, T=3', fontsize=14, fontweight='bold')
ax.axis('off')

# 定义位置参数
time_steps = [0, 1, 2]
x_positions = [1, 4, 7]
y_base = 5

# 绘制三个时间步
for i, (t, x_pos) in enumerate(zip(time_steps, x_positions)):
    # x_t 方块
    x_rect = patches.FancyBboxPatch((x_pos - 0.5, y_base), 1, 0.8,
                                    boxstyle="round,pad=0.05",
                                    facecolor='lightblue', edgecolor='black')
    ax.add_patch(x_rect)
    ax.text(x_pos, y_base + 0.4, f'x_t\nbatch=2', ha='center', va='center', fontsize=10)

    # RNN Cell 方块
    rnn_rect = patches.FancyBboxPatch((x_pos - 0.5, y_base - 1.5), 1, 0.8,
                                      boxstyle="round,pad=0.05",
                                      facecolor='lightgreen', edgecolor='black')
    ax.add_patch(rnn_rect)
    ax.text(x_pos, y_base - 1.1, f'RNN\nCell', ha='center', va='center', fontsize=10)

    # y_t 方块
    y_rect = patches.FancyBboxPatch((x_pos - 0.5, y_base - 3), 1, 0.8,
                                    boxstyle="round,pad=0.05",
                                    facecolor='lightcoral', edgecolor='black')
    ax.add_patch(y_rect)
    ax.text(x_pos, y_base - 2.6, f'y_t\n(1,2)', ha='center', va='center', fontsize=10)

    # 绘制箭头：x_t -> RNN
    ax.arrow(x_pos, y_base - 0.1, 0, -0.3, head_width=0.1, head_length=0.1, fc='gray', ec='gray')

    # 绘制箭头：RNN -> y_t
    ax.arrow(x_pos, y_base - 1.5, 0, -0.3, head_width=0.1, head_length=0.1, fc='gray', ec='gray')

    # 水平箭头：s_prev -> s_next
    if i < 2:
        ax.annotate('', xy=(x_pos + 0.6, y_base - 1.1), xytext=(x_pos + 0.4, y_base - 1.1),
                    arrowprops=dict(arrowstyle='->', color='red', lw=2))
        ax.text(x_pos + 0.8, y_base - 1.3, 's_t', fontsize=9, color='red')

# 添加形状标注
ax.text(5, y_base + 1, 'Input: x.shape = (2,1,3)', fontsize=11, ha='center',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
ax.text(5, y_base - 3.8, 'Output: y.shape = (1,2,3)', fontsize=11, ha='center',
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

plt.tight_layout()
plt.show()