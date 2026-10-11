
import torchvision
from torch import nn
# train_data = torchvision.datasets.ImageNet(root='./data',split='train',download='True',
#                                            transform=torchvision.transforms.ToTensor())


'''
VGG16 是一个经典的深度卷积神经网络模型，由牛津大学的 Visual Geometry Group（VGG）在 2014 年提出。
它在当年的 ImageNet 图像分类比赛中取得了很好的成绩，
并且因为结构简洁、易于理解而成为计算机视觉领域的“入门必学”模型之一。
'''
#要求预训练就要下载参数 如果不用与训练就不需要下载
'''
VGG16 分为三个部分：

features：卷积层 + 激活函数 + 池化层，负责提取图像特征

avgpool：自适应平均池化，将任意尺寸的特征图统一变成 7×7

classifier：全连接层 + Dropout，负责分类
'''
vgg_false = torchvision.models.vgg16(pretrained=False)
vgg_true = torchvision.models.vgg16(pretrained=True)

# print('ok')
# print(vgg_true)

train_data = torchvision.datasets.CIFAR10('./data',train=True,transform = torchvision.transforms.ToTensor())

#另起一部分
vgg_true.add_module('add_linear',nn.Linear(1000,10))
# print(vgg_true)

#在classifier内添加
vgg_true.classifier.add_module('add_linear_2',nn.Linear(1000,10))

print(vgg_false)
vgg_false.classifier[6] = nn.Linear(1000,10)
print(vgg_false)