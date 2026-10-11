
import torch
from torch import nn
import torch.nn.functional as F
#nn直接调用Conv2D有内部定义参数，F调用需要手动定义参数
#一般在有参数层nn调用，无参数用F调用
'''

有参数的层（Conv2d, Linear, BatchNorm 等）→ 使用 nn

无参数的函数（ReLU, max_pool2d, softmax 等）→ 使用 F

可二选一的（Dropout, ReLU 等）→ 习惯用 F 更简洁，除非需要特殊配置

记忆技巧：

nn = Neural Network layer（有状态，有参数）

F = Functional（纯函数，无状态）

实际编码中，大多数人会混用两者，根据是否有参数来选择。
'''
#2维矩阵
input = torch.tensor([[1,2,0,3,1],
                     [0,1,2,3,1],
                     [1,2,1,0,0],
                     [5,2,3,1,1],
                     [2,1,0,1,1]])

kernel = torch.tensor([[1,2,1],
                       [0,1,0],
                       [2,1,0]])

print(input.shape,kernel.shape)
'''

参数名	    作用	            常见取值/示例	             输出尺寸影响
in_channels	输入数据的通道数。	灰度图为1，彩色RGB图为3。	无直接影响。
out_channels	卷积核的数量，也是输出特征图的深度。	常用32、64、128等。	决定输出的通道数。
kernel_size	卷积核的大小。	3 (表示3x3), (5, 5)。	值越大，输出尺寸越小。
stride	卷积核滑动的步长。	默认为1，2可使输出尺寸减半。	步长越大，输出尺寸越小。
padding	在输入外围填充的层数。	0(无填充), 1, 'same'(使输出与输入同尺寸)。	填充越多，输出尺寸越大。

'''

#Conv2d 期望的输入形状是：(批量大小, 通道数, 高度, 宽度)
#unsqueeze 添加维度  unsqueese[x]在x处添加新的维度  [32,32]-->  [1,32,32]--> [1,1,32,32]
#Conv2D必须输入浮点类型
# input_4D = input.reshape(input,[1,1,32,32])
input_4D = input.float().unsqueeze(0).unsqueeze(0)

print(input_4D.shape)
#Conv_2D自动匹配 kernel大小
conv_layer = nn.Conv2d(in_channels=1,out_channels=1,
                       kernel_size=(3,3),stride=(1,1))

output = conv_layer(input_4D)

print(output.shape)

#padding
#注意 F.conv2d需要手动创建weights 也即 kernel = [1,1,3,3]
kernel_f = kernel.float().unsqueeze(0).unsqueeze(0)
output_f = F.conv2d(input_4D,kernel_f,stride=(1,1),padding=1)
print(output_f.shape)