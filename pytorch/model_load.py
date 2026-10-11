

import torch
import torchvision
# 也可以在开头直接导入模块
from model_save import *
#方式一：加载模型
#这种方式加载有一个弊端，就是必须定义一个与加载模型相同的类：
#总而言之是能让程序访问到我们定义的东西
# class Tudui(torch.nn.Module):
#     def __init__(self):
#         super(Tudui, self).__init__()
#         self.conv_1 = torch.nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1)
#
#     def forward(self,x):
#         x = self.conv_1(x)
#         return x

model = torch.load('tudui.pth')
print(model)
#方式2： 加载模型
#
# vgg16 = torchvision.models.vgg16(pretrained=False)
# vgg16.load_state_dict(torch.load('C:/Users/pc/Desktop/pytorch/model.pt'))
# print(vgg16)