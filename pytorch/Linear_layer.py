
import torch
from torch import nn
import torchvision
from torch.utils.data import DataLoader

datast = torchvision.datasets.CIFAR10(root='./data',train=False,
                                      download=True,transform=torchvision.transforms.ToTensor())

dataloader = DataLoader(datast,batch_size=64)

class Tudui(nn.Module):
    def __init__(self):
        super().__init__()
        # 这行代码定义了一个输入维度为 19608，输出维度为 10 的线性层（全连接层）
        self.Linear_1 = nn.Linear(19608,10)

    def forward(self,input):
        output = self.Linear_1(input)
        return output

tudui = Tudui()


for data in dataloader:
    imgs,targets = data

    print(imgs.shape)
    input = torch.reshape(imgs,(1,1,1,-1))

    #将任意形状的张量展平成一个一维向量
    output = torch.flatten(input)
    print(output.shape)
    output = tudui(output)
    print(output.shape)


