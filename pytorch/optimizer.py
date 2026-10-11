

import torch
import torchvision
from torch import nn
from torch.utils.data import DataLoader

dataset = torchvision.datasets.CIFAR10(root='./data', train=True, download=True,
                                      transform=torchvision.transforms.ToTensor())
dataloader = DataLoader(batch_size=64, dataset=dataset)




# 现在的参数都是随机的  只有当模型开始训练才会调整
class Tudui(nn.Module):
    def __init__(self):
        super(Tudui, self).__init__()
        self.conv_1 = nn.Conv2d(in_channels=3, out_channels=32,
                                kernel_size=5, stride=1, padding=2)
        # kernel_size = 2,strides = kernel_size padding = 0
        self.maxpool_1 = nn.MaxPool2d(2)
        self.conv_2 = nn.Conv2d(in_channels=32, out_channels=32,
                                kernel_size=5 ,padding=2)
        self.maxpool_2 = nn.MaxPool2d(2)
        self.conv_3 = nn.Conv2d(in_channels=32, out_channels=64,
                                kernel_size=5 ,padding=2)
        # 进入线性层
        '''
        nn.Flatten() 会做两件事：

        保留 batch 维度（如果有的话）

        将所有其他维度拉成一维  64通道4*4 --> 如果 batch_size =1 --> (1 , 1*64*4*4)
        '''
        self.flatten_1 = nn.Flatten()
        '''
        参数	你的代码中的值	含义
        in_features	64	输入特征的数量（输入向量的长度）
        out_features	32	输出特征的数量（输出向量的长度）
        '''
        # 也可以用sequential
        # self.model_1 = self.nn.sequential(
        #
        #     nn.Conv2d(in_channels=3, out_channels=32,
        #               kernel_size=5, stride=1, padding=2),
        #     nn.MaxPool2d(2),
        #     nn.Conv2d(in_channels=32, out_channels=32,
        #               kernel_size=5, padding=2),
        #     nn.MaxPool2d(2),
        #     nn.Conv2d(in_channels=32, out_channels=64,
        #               kernel_size=5, padding=2),
        #     nn.Flatten()
        # )
        self.linear_1 = nn.Linear(in_features=4096, out_features=64)
        self.linear_2 = nn.Linear(in_features=64, out_features=10)




    def forward(self, x):

        # x = self.model_1(x)
        x = self.conv_1(x)
        x = self.maxpool_1(x)
        x = self.conv_2(x)
        x = self.maxpool_2(x)
        x = self.conv_3(x)
        x = self.flatten_1(x)
        # 如果linear长度不好算，可以先跑到flatten，看输出大小
        x = self.linear_1(x)
        x = self.linear_2(x)
        return x

tudui = Tudui()
# 计算实际输出与目标之间的差距 为更新参数提供空间
loss = nn.CrossEntropyLoss()

#设置优化器 调整参数 卷积核等都是参数
optim  = torch.optim.SGD(tudui.parameters(), lr=0.001)

# 数据集要学习多次
for epoch in range(20):
    running_loss = 0.0
    for data in dataloader:
        imgs,targets = data
        output = tudui(imgs)
        # print(output)
        # print(targets)
        loss_val = loss(output, targets)
        # 进行新的迭代，清空上一次的迭代梯度 防止出现梯度爆炸或消失
        optim.zero_grad()
        #反向传播计算每个参数的梯度
        loss_val.backward()
        #更新参数
        optim.step()
        print(loss_val)
        # 使用item()取出张量的数值
        running_loss += loss_val.item()/len(dataloader)
    # 每学完一轮查看损失值
    print(running_loss)