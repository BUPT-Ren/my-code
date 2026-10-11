

#池化提取图像的重要特征
import torch
import torchvision
from torchvision.utils import make_grid
from torch import nn
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
# input = torch.tensor ([[1,2,0,3,1],
#                        [0,1,2,3,1],
#                        [1,2,1,0,0],
#                        [5,2,3,1,1],
#                        [2,1,0,1,1]],dtype=torch.float32)



dataset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True,
                                       transform=torchvision.transforms.ToTensor())
#-1 让·torch自动计算维度大小 比如输入100张5*5的图，维度自动变成100
# input = torch.reshape(input,(-1,1,5,5))

dataloader = DataLoader(dataset,batch_size=64)

#搭建神经网络
class Tudui(nn.Module):
    #写初始化
    def __init__(self):
        super(Tudui, self).__init__()
        #不写stride == kernel_size
        self.maxpool1 = nn.MaxPool2d(kernel_size=(3,3),ceil_mode=False)

    def forward(self, input):
        output = self.maxpool1(input)
        return output



tudui = Tudui()

writer = SummaryWriter('logs')
step = 0
for data in dataloader:

    imgs,targets = data
    writer.add_image('input',make_grid(imgs),step)
    output = tudui.forward(imgs)
    writer.add_image('output',make_grid(output),step)
    step = step+1

# output = tudui(input)
# print(output)
# print(output.size())