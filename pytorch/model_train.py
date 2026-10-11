import torch
import torchvision
from torch.utils.tensorboard import SummaryWriter
from model import *
import torch.nn as nn

# 准备数据集
train_data = torchvision.datasets.CIFAR10(root='./data', train=True, download=True,
                                          transform=torchvision.transforms.ToTensor())
test_data = torchvision.datasets.CIFAR10(root='./data', train=False, download=True,
                                         transform=torchvision.transforms.ToTensor())

train_data_size = len(train_data)
test_data_size = len(test_data)
print('训练数据集的长度为{}'.format(train_data_size))
print('测试数据集的长度为{}'.format(test_data_size))

# 利用dataloader来加载数据集
train_dataloader = torch.utils.data.DataLoader(train_data, batch_size=64)
test_dataloader = torch.utils.data.DataLoader(test_data, batch_size=64)

# 搭建神经网络
tudui = Tudui()

# 创建损失函数
Loss_fn = nn.CrossEntropyLoss()

# 优化器
learning_rate = 0.01
optimizer = torch.optim.SGD(tudui.parameters(), lr=learning_rate)

# 记录训练的次数
total_train_step = 0
# 记录测试的次数
total_test_step = 0

# 训练的轮数
epochs = 10

# 添加Tensorboard
writer = SummaryWriter('logs')

for i in range(epochs):
    print('------------第{}轮训练开始-----------'.format(i + 1))

    # 训练步骤开始
    for data in train_dataloader:
        imgs, targets = data
        outputs = tudui(imgs)

        # 清空之前的梯度
        optimizer.zero_grad()
        loss = Loss_fn(outputs, targets)
        loss.backward()
        optimizer.step()

        total_train_step += 1

        if total_train_step % 100 == 0:
            # item() 把元素取出来
            print('训练次数{}，loss:{}'.format(total_train_step, loss.item()))
            # 绘制损失值曲线
            writer.add_scalar('train_loss', loss.item(), total_train_step)

    # 测试步骤 - 注意缩进：这个for循环结束后才执行
    total_loss = 0
    with torch.no_grad():
        for data in test_dataloader:
            imgs, targets = data
            outputs = tudui(imgs)
            loss = Loss_fn(outputs, targets)
            total_loss += loss.item()

    # 计算平均损失（更合理）
    avg_test_loss = total_loss / len(test_dataloader)
    print('第{}轮测试，整体测试集上的总Loss值: {}, 平均Loss值: {}'.format(i + 1, total_loss, avg_test_loss))
    writer.add_scalar('test_loss', avg_test_loss, total_test_step)
    total_test_step += 1

writer.close()
print("训练完成！")