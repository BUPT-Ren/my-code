
import torch
import torchvision
from torch import nn
from torchvision.utils import make_grid
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter

#tensor 将0-255的图片直接除255-->(0,1)，不会改变RGB的比例关系，所以正常显示彩色图
input = torch.tensor([[1,-0.5],
                     [-1,3]],dtype=torch.float32)

input = torch.reshape(input,(-1,1,2,2))

# print(input.size())

dataset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True,
                                       transform=torchvision.transforms.ToTensor())

dataloader = DataLoader(dataset,batch_size=64)

class Tudui(nn.Module):
    def __init__(self):
        super(Tudui, self).__init__()
        self.relu_1 = nn.ReLU()
        #sigmoid 函数会对RGB做非线性变换，破坏原本彩色图片的比例关系，导致图片发灰
        self.sigmoid_1 = nn.Sigmoid()

    def forward(self, input):
        output = self.sigmoid_1(input)
        return output

tudui = Tudui()

writer = SummaryWriter('logs')
output = tudui(input)

step = 0

for data in dataloader:
    imgs,targets = data
    writer.add_image('input',make_grid(imgs),step)
    output_imgs = tudui(imgs)
    writer.add_image('output',make_grid(output_imgs),step)
    step = step+1

# print(output)
# print(output.size())

